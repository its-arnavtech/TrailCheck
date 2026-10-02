import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AskDto } from './dto/ask.dto';
import { HazardsService } from '../hazards/hazards.service';
import {
  type DerivedHazard,
  type SeasonalHazardAssessment,
} from '../hazards/hazard.types';
import { NpsAlert, NpsService } from '../nps/nps.service';
import { ParkWeather, WeatherService } from '../weather/weather.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalModelService } from './local-model.service';
import type {
  LocalModelResult,
  LocalStructuredOutput,
} from './local-model.types';
import { getStaticParkBySlug } from '../catalog/static-park-data';
import { DeepseekDailyBudget } from './deepseek-budget';
import {
  buildDigestCacheKey,
  clampMaxOutputTokens,
  DEEPSEEK_CHAT_COMPLETIONS_URL,
  DEFAULT_DEEPSEEK_DAILY_LIMIT,
  DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS,
  DEFAULT_DEEPSEEK_MODEL,
  isUsableDeepseekApiKey,
  redactSecret,
  utcDayStamp,
} from './deepseek.config';

export interface RagDocument {
  id: string;
  source: 'nps' | 'nws' | 'hazard';
  title: string;
  content: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AskResponse {
  parkSlug: string;
  question: string;
  answer: string;
  notice: string;
  generationSource: 'local' | 'deepseek' | 'fallback';
  generationError: string | null;
  structuredOutput: LocalStructuredOutput | null;
  hazards: DerivedHazard[];
  hazardAssessment: SeasonalHazardAssessment;
  alerts: NpsAlert[];
  weather: ParkWeather | null;
  context: RagDocument[];
}

export interface ParkDigestResult {
  dataAvailability?: { alerts: boolean; weather: boolean };
  parkSlug: string;
  shortSummary: string;
  notification: string;
  generationSource: 'local' | 'deepseek' | 'fallback';
  generationError: string | null;
  structuredOutput: LocalStructuredOutput | null;
  retrievedContext: RagDocument[];
  hazards: DerivedHazard[];
  hazardAssessment: SeasonalHazardAssessment;
  alerts: NpsAlert[];
  weather: ParkWeather | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly deepseekBudget: DeepseekDailyBudget;
  private readonly digestCache = new Map<string, ParkDigestResult>();
  private readonly inFlightDigests = new Map<
    string,
    Promise<ParkDigestResult>
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly npsService: NpsService,
    private readonly weatherService: WeatherService,
    private readonly hazardsService: HazardsService,
    private readonly prisma: PrismaService,
    private readonly localModelService: LocalModelService,
  ) {
    this.deepseekBudget = new DeepseekDailyBudget(this.getDailyLimit());
  }

  async ask(dto: AskDto): Promise<AskResponse> {
    const { parkName, alerts, weather, hazardAssessment, hazards, context } =
      await this.collectParkContext(dto.parkSlug);
    const fallbackNotice = this.hazardsService.buildNotice(
      hazardAssessment,
      weather,
    );
    const localResult = await this.tryLocalStructuredOutput('ask', {
      parkSlug: dto.parkSlug,
      parkName,
      alerts,
      weather,
      hazardAssessment,
      hazards,
    });

    if (localResult?.ok && localResult.output) {
      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer: this.buildAnswerFromStructuredOutput(
          dto.question,
          localResult.output,
        ),
        notice: this.truncateForPrompt(localResult.output.notification, 160),
        generationSource: 'local',
        generationError: null,
        structuredOutput: localResult.output,
        hazards,
        hazardAssessment,
        alerts,
        weather,
        context,
      };
    }

    const localFailureMessage = this.describeLocalFailure(localResult);

    if (!this.isDeepseekConfigured()) {
      this.logRulesFallback(
        'ask',
        dto.parkSlug,
        this.combineGenerationErrors(
          localFailureMessage,
          'DEEPSEEK_API_KEY is missing',
        ) ?? 'DeepSeek is not configured',
      );

      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer: this.buildFallbackAnswer(
          dto.question,
          hazards,
          alerts,
          weather,
        ),
        notice: fallbackNotice,
        generationSource: 'fallback',
        generationError: this.combineGenerationErrors(
          localFailureMessage,
          'DEEPSEEK_API_KEY is missing',
        ),
        structuredOutput: null,
        hazards,
        hazardAssessment,
        alerts,
        weather,
        context,
      };
    }

    try {
      const answer = await this.generateAskAnswerWithLogging(
        'ask',
        dto.parkSlug,
        dto,
        context,
        fallbackNotice,
      );

      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer,
        notice: fallbackNotice,
        generationSource: 'deepseek',
        generationError: localFailureMessage,
        structuredOutput: null,
        hazards,
        hazardAssessment,
        alerts,
        weather,
        context,
      };
    } catch (error) {
      this.logRulesFallback(
        'ask',
        dto.parkSlug,
        this.combineGenerationErrors(
          localFailureMessage,
          this.safeErrorMessage(error),
        ) ?? 'Unknown generation failure',
      );

      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer: this.buildFallbackAnswer(
          dto.question,
          hazards,
          alerts,
          weather,
        ),
        notice: fallbackNotice,
        generationSource: 'fallback',
        generationError: this.combineGenerationErrors(
          localFailureMessage,
          this.safeErrorMessage(error),
        ),
        structuredOutput: null,
        hazards,
        hazardAssessment,
        alerts,
        weather,
        context,
      };
    }
  }

  async generateParkDigest(parkSlug: string): Promise<ParkDigestResult> {
    const cacheKey = this.digestCacheKey(parkSlug);
    const cached = this.digestCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const existingRequest = this.inFlightDigests.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = this.buildParkDigest(parkSlug)
      .then((value) => {
        this.rememberDigest(cacheKey, value);
        return value;
      })
      .finally(() => {
        this.inFlightDigests.delete(cacheKey);
      });

    this.inFlightDigests.set(cacheKey, request);

    return request;
  }

  isDeepseekConfigured(): boolean {
    return isUsableDeepseekApiKey(this.readDeepseekApiKey());
  }

  private async collectParkContext(parkSlug: string): Promise<{
    parkName: string;
    alerts: NpsAlert[];
    weather: ParkWeather | null;
    hazardAssessment: SeasonalHazardAssessment;
    hazards: DerivedHazard[];
    context: RagDocument[];
  }> {
    const [parkRecord, npsPayload, weatherPayload] = await Promise.all([
      this.prisma.isAvailable()
        ? this.prisma.park.findUnique({
            where: { slug: parkSlug },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      this.npsService.getAlertsPayloadForPark(parkSlug),
      this.weatherService.getWeatherPayloadForPark(parkSlug),
    ]);

    if (parkRecord && this.prisma.isAvailable()) {
      void this.prisma.parkSnapshot
        .create({
          data: {
            parkId: parkRecord.id,
            npsRaw: this.toSnapshotJsonValue(npsPayload.raw),
            nwsRaw: this.toSnapshotJsonValue(weatherPayload.raw),
          },
        })
        .catch((error) => {
          this.logger.warn(
            `Skipping park snapshot persistence for "${parkSlug}": ${
              error instanceof Error ? error.message : 'Unknown snapshot error'
            }`,
          );
        });
    } else if (this.prisma.isAvailable()) {
      this.logger.warn(
        `Skipping snapshot storage because park "${parkSlug}" was not found.`,
      );
    }

    const alerts = npsPayload.alerts;
    const weather = weatherPayload.weather;
    const hazardAssessment = this.hazardsService.assessParkHazards(
      parkSlug,
      alerts,
      weather,
    );
    const hazards = hazardAssessment.activeHazards;
    const context = this.buildContext({
      parkSlug,
      alerts,
      weather,
      hazardAssessment,
      hazards,
    });
    const parkName =
      parkRecord?.name ??
      getStaticParkBySlug(parkSlug)?.name ??
      this.humanizeParkSlug(parkSlug);

    return { parkName, alerts, weather, hazardAssessment, hazards, context };
  }

  private async generateAskAnswer(
    dto: AskDto,
    context: RagDocument[],
    notice: string,
  ): Promise<string> {
    const apiKey = this.readDeepseekApiKey();
    if (!isUsableDeepseekApiKey(apiKey)) {
      throw new Error('DEEPSEEK_API_KEY is missing');
    }

    if (!this.deepseekBudget.tryConsume()) {
      throw new Error('DeepSeek daily request limit reached');
    }

    const model = this.getModelName();
    const maxTokens = this.getMaxOutputTokens();
    const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are TrailCheck. Use only the supplied park context. Do not invent closures or weather. Write 2 or 3 short sentences and end with one practical next step.',
          },
          {
            role: 'user',
            content: this.buildAskPrompt(dto, context, notice),
          },
        ],
        max_tokens: maxTokens,
        temperature: 0,
        thinking: { type: 'disabled' },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `DeepSeek request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const answer = payload.choices?.[0]?.message?.content?.trim() ?? '';

    if (!answer) {
      throw new Error('DeepSeek returned an empty answer.');
    }

    if (!this.isUsableAnswer(answer)) {
      throw new Error('DeepSeek returned an incomplete answer.');
    }

    return answer;
  }

  private async tryLocalStructuredOutput(
    flow: 'ask' | 'digest',
    params: {
      parkSlug: string;
      parkName: string;
      alerts: NpsAlert[];
      weather: ParkWeather | null;
      hazardAssessment: SeasonalHazardAssessment;
      hazards: DerivedHazard[];
    },
  ): Promise<LocalModelResult | null> {
    if (!this.localModelService.isEnabled()) {
      this.logger.log(
        `[${flow}] Local model disabled for "${params.parkSlug}", skipping local generation.`,
      );
      return null;
    }

    const localTimeoutMs = this.localModelService.getTimeoutMs();
    const attemptBudgetMs =
      flow === 'digest'
        ? this.getEffectiveLocalDigestBudgetMs(localTimeoutMs)
        : localTimeoutMs;
    const localInput = this.buildLocalModelInput(params);
    const startedAt = Date.now();

    this.logger.log(
      `[${flow}] Starting local generation for "${params.parkSlug}" (localTimeout=${localTimeoutMs}ms${flow === 'digest' ? `, digestBudget=${attemptBudgetMs}ms` : ''}).`,
    );

    try {
      const result =
        flow === 'digest'
          ? await this.withTimeout(
              this.localModelService.generate(localInput),
              attemptBudgetMs,
              `Local digest generation timed out after ${attemptBudgetMs}ms`,
            )
          : await this.localModelService.generate(localInput);

      const elapsedMs = Date.now() - startedAt;
      if (result.ok && result.output) {
        this.logger.log(
          `[${flow}] Local generation succeeded for "${params.parkSlug}" in ${elapsedMs}ms.`,
        );
      } else {
        this.logger.warn(
          `[${flow}] Local generation failed for "${params.parkSlug}" in ${elapsedMs}ms: ${this.describeLocalFailure(result) ?? 'Local model returned no structured output.'}`,
        );
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown local model error';
      this.logger.warn(
        `[${flow}] Local generation threw for "${params.parkSlug}" after ${Date.now() - startedAt}ms: ${message}`,
      );

      return {
        ok: false,
        fallbackRecommended: true,
        output: null,
        errors: [message],
      };
    }
  }

  private buildLocalModelInput(params: {
    parkSlug: string;
    parkName: string;
    alerts: NpsAlert[];
    weather: ParkWeather | null;
    hazardAssessment: SeasonalHazardAssessment;
    hazards: DerivedHazard[];
  }): Record<string, unknown> {
    const forecast = params.weather?.forecast ?? [];
    const normalizedTemperatures = forecast
      .map((period) =>
        this.normalizeForecastTemperature(
          period.temperature,
          period.temperatureUnit,
        ),
      )
      .filter((value): value is number => value !== null);
    const maxTempF = normalizedTemperatures.length
      ? Math.max(...normalizedTemperatures)
      : null;
    const minTempF = normalizedTemperatures.length
      ? Math.min(...normalizedTemperatures)
      : null;
    const weatherText = forecast
      .map((period) => `${period.shortForecast} ${period.detailedForecast}`)
      .join(' ')
      .toLowerCase();
    const wetSignal =
      /(rain|showers|thunderstorm|storm|flood|downpour)/.test(weatherText) ||
      params.hazards.some((hazard) =>
        ['FLOODING', 'MUD', 'LIGHTNING'].includes(hazard.type),
      );
    const snowSignal =
      /(snow|sleet|blizzard|flurries|freezing rain|icy|ice)/.test(
        weatherText,
      ) || params.hazards.some((hazard) => hazard.type === 'SNOW_ICE');

    return {
      parkName: params.parkName,
      parkCode: params.hazardAssessment.parkCode ?? params.parkSlug,
      parkSlug: params.parkSlug,
      date: new Date().toISOString().slice(0, 10),
      season: params.hazardAssessment.season.toUpperCase(),
      hazardProfile: params.hazardAssessment.profile,
      weather: {
        maxTempC: this.toCelsius(maxTempF),
        maxTempF,
        minTempC: this.toCelsius(minTempF),
        minTempF,
        precipitationMm: null,
        snowMm: null,
        forecast: forecast.map((period) => ({
          name: period.name,
          temperature: period.temperature,
          temperatureUnit: period.temperatureUnit,
          windSpeed: period.windSpeed,
          shortForecast: period.shortForecast,
          detailedForecast: period.detailedForecast,
        })),
      },
      derivedHazardSignals: {
        existingRuleLabels: params.hazards.map((hazard) => hazard.type),
        riskLevel: params.hazardAssessment.riskLevel.toUpperCase(),
        ignoredHazards: params.hazardAssessment.ignoredHazards,
        isHot: maxTempF !== null && maxTempF >= 90,
        isFreezing: minTempF !== null && minTempF <= 32,
        isVeryWet: wetSignal,
        hasSnowSignal: snowSignal,
      },
      seasonalAssessment: {
        riskLevel: params.hazardAssessment.riskLevel.toUpperCase(),
        activeHazards: params.hazards.map((hazard) => ({
          type: hazard.type,
          severity: hazard.severity.toUpperCase(),
          summary: hazard.summary,
          reason: hazard.reason,
          source: hazard.source,
        })),
      },
      activeAlerts: params.alerts.map((alert) => ({
        title: alert.title,
        category: alert.category,
        impact: this.truncateForPrompt(
          this.cleanSummaryText(alert.description),
          220,
        ),
      })),
      alertContextMode: params.alerts.length ? 'live_nps' : 'none',
    };
  }

  private buildContext(params: {
    parkSlug: string;
    alerts: NpsAlert[];
    weather: ParkWeather | null;
    hazardAssessment: SeasonalHazardAssessment;
    hazards: DerivedHazard[];
  }): RagDocument[] {
    const assessmentDoc: RagDocument = {
      id: `seasonal-profile-${params.parkSlug}`,
      source: 'hazard',
      title: `${params.hazardAssessment.season} ${params.hazardAssessment.profile.replace(/_/g, ' ')} hazard profile`,
      content: `Risk level ${params.hazardAssessment.riskLevel}. Active hazards: ${params.hazardAssessment.activeHazards.map((hazard) => hazard.type).join(', ') || 'none'}. Ignored hazards: ${params.hazardAssessment.ignoredHazards.join(', ') || 'none'}.`,
      metadata: {
        season: params.hazardAssessment.season,
        profile: params.hazardAssessment.profile,
        riskLevel: params.hazardAssessment.riskLevel,
      },
    };

    const hazardDocs = params.hazards.map((hazard) => ({
      id: hazard.id,
      source: 'hazard' as const,
      title: hazard.title,
      content: `${hazard.severity.toUpperCase()} hazard. ${hazard.summary}`,
      metadata: {
        type: hazard.type,
        profile: hazard.profile,
        season: hazard.season,
        severity: hazard.severity,
        priority: hazard.priority,
        score: hazard.score,
        source: hazard.source,
        tags: hazard.tags.join(', '),
      },
    }));

    const alertDocs = params.alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      source: 'nps' as const,
      title: alert.title,
      content: `${alert.category}: ${this.truncateForPrompt(alert.description, 260)}`,
      metadata: {
        parkCode: alert.parkCode,
        category: alert.category,
        url: alert.url,
      },
    }));

    const weatherDocs =
      params.weather?.forecast.map((period, index) => ({
        id: `forecast-${params.parkSlug}-${index}`,
        source: 'nws' as const,
        title: period.name,
        content: this.truncateForPrompt(
          `${period.shortForecast}. Temp ${period.temperature}${period.temperatureUnit}. Wind ${period.windSpeed}. ${period.detailedForecast}`,
          260,
        ),
        metadata: {
          temperature: period.temperature,
          temperatureUnit: period.temperatureUnit,
          windSpeed: period.windSpeed,
        },
      })) ?? [];

    return [assessmentDoc, ...hazardDocs, ...alertDocs, ...weatherDocs].slice(
      0,
      10,
    );
  }

  private async buildParkDigest(parkSlug: string): Promise<ParkDigestResult> {
    const result = await this.buildParkDigestContent(parkSlug);
    const payload = await this.npsService.getAlertsPayloadForPark(parkSlug);
    return {
      ...result,
      dataAvailability: {
        alerts: payload.raw !== null,
        weather: result.weather !== null,
      },
    };
  }

  private async buildParkDigestContent(
    parkSlug: string,
  ): Promise<ParkDigestResult> {
    const { parkName, alerts, weather, hazardAssessment, hazards, context } =
      await this.collectParkContext(parkSlug);
    const fallbackNotice = this.hazardsService.buildNotice(
      hazardAssessment,
      weather,
    );

    const localResult = await this.tryLocalStructuredOutput('digest', {
      parkSlug,
      parkName,
      alerts,
      weather,
      hazardAssessment,
      hazards,
    });

    const structuredOutput =
      localResult?.ok && localResult.output ? localResult.output : null;
    const localFailureMessage = this.describeLocalFailure(localResult);

    if (structuredOutput) {
      return {
        parkSlug,
        shortSummary:
          this.buildDigestSummaryFromStructuredOutput(structuredOutput),
        notification: this.truncateForPrompt(
          structuredOutput.notification,
          160,
        ),
        generationSource: 'local',
        generationError: null,
        structuredOutput,
        retrievedContext: context,
        hazards,
        hazardAssessment,
        alerts,
        weather,
      };
    }

    if (this.isDeepseekConfigured()) {
      try {
        const answer = await this.generateAskAnswerWithLogging(
          'digest',
          parkSlug,
          {
            parkSlug,
            question:
              'What important conditions and hazards should visitors know right now?',
          },
          context,
          fallbackNotice,
          this.getDigestGenerationTimeoutMs(),
        );

        return {
          parkSlug,
          shortSummary: this.buildDigestSummaryFromAnswer(answer),
          notification: this.truncateForPrompt(fallbackNotice, 160),
          generationSource: 'deepseek',
          generationError: localFailureMessage,
          structuredOutput: null,
          retrievedContext: context,
          hazards,
          hazardAssessment,
          alerts,
          weather,
        };
      } catch (error) {
        this.logRulesFallback(
          'digest',
          parkSlug,
          this.combineGenerationErrors(
            localFailureMessage,
            this.safeErrorMessage(error),
          ) ?? 'Unknown generation failure',
        );

        return {
          parkSlug,
          shortSummary: this.buildDigestSummary(
            fallbackNotice,
            hazards,
            alerts,
            weather,
          ),
          notification: this.truncateForPrompt(fallbackNotice, 160),
          generationSource: 'fallback',
          generationError: this.combineGenerationErrors(
            localFailureMessage,
            this.safeErrorMessage(error),
          ),
          structuredOutput: null,
          retrievedContext: context,
          hazards,
          hazardAssessment,
          alerts,
          weather,
        };
      }
    }

    this.logRulesFallback(
      'digest',
      parkSlug,
      this.combineGenerationErrors(
        localFailureMessage,
        'DEEPSEEK_API_KEY is missing',
      ) ?? 'DeepSeek is not configured',
    );

    return {
      parkSlug,
      shortSummary: this.buildDigestSummary(
        fallbackNotice,
        hazards,
        alerts,
        weather,
      ),
      notification: this.truncateForPrompt(fallbackNotice, 160),
      generationSource: 'fallback',
      generationError: this.combineGenerationErrors(
        localFailureMessage,
        'DEEPSEEK_API_KEY is missing',
      ),
      structuredOutput: null,
      retrievedContext: context,
      hazards,
      hazardAssessment,
      alerts,
      weather,
    };
  }

  private toSnapshotJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
    if (value == null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private buildAskPrompt(
    dto: AskDto,
    context: RagDocument[],
    notice: string,
  ): string {
    const serializedContext = context
      .slice(0, 4)
      .map(
        (doc, index) =>
          `${index + 1}. [${doc.source}] ${this.truncateForPrompt(doc.title, 60)}: ${this.truncateForPrompt(doc.content, 120)}`,
      )
      .join('\n');

    return [
      `Park: ${dto.parkSlug}`,
      `Question: ${this.truncateForPrompt(dto.question, 180)}`,
      `Notice: ${this.truncateForPrompt(notice, 140)}`,
      serializedContext || 'No live context.',
    ].join('\n');
  }

  private buildFallbackAnswer(
    question: string,
    hazards: DerivedHazard[],
    alerts: NpsAlert[],
    weather: ParkWeather | null,
  ): string {
    const topHazard = hazards[0];
    if (topHazard) {
      return `Based on current NPS and NWS data, the main issue relevant to "${question}" is ${topHazard.title.toLowerCase()}. ${topHazard.summary}`;
    }

    const topAlert = alerts[0];
    if (topAlert) {
      return `Based on current NPS data, the main park alert is "${topAlert.title}". ${this.truncateForPrompt(topAlert.description, 220)}`;
    }

    const forecast = weather?.forecast[0];
    if (forecast) {
      return `Based on the latest NWS forecast, ${forecast.name.toLowerCase()} is expected to bring ${forecast.shortForecast.toLowerCase()} with winds ${forecast.windSpeed} and temperatures around ${forecast.temperature}${forecast.temperatureUnit}.`;
    }

    return `I could not find enough live park condition data to confidently answer "${question}" right now.`;
  }

  private buildAnswerFromStructuredOutput(
    question: string,
    structuredOutput: LocalStructuredOutput,
  ): string {
    const hazardSentence = structuredOutput.hazards.length
      ? `Main hazards right now are ${this.joinList(
          structuredOutput.hazards
            .slice(0, 3)
            .map((hazard) => this.humanizeLabel(hazard.type)),
        )}.`
      : 'No major hazards were identified from the available weather and alert inputs.';
    const alertSentence = structuredOutput.alerts.length
      ? `Active alerts include ${this.joinList(
          structuredOutput.alerts
            .slice(0, 2)
            .map((alert) => `"${this.truncateForPrompt(alert.title, 80)}"`),
        )}.`
      : '';

    return this.truncateForPrompt(
      [
        `For "${question}", ${structuredOutput.notification}`,
        hazardSentence,
        alertSentence,
        structuredOutput.recommendedAction,
      ]
        .filter(Boolean)
        .join(' '),
      420,
    );
  }

  private buildDigestSummaryFromAnswer(answer: string): string {
    return this.truncateForPrompt(answer.replace(/\s+/g, ' ').trim(), 220);
  }

  private buildDigestSummaryFromStructuredOutput(
    structuredOutput: LocalStructuredOutput,
  ): string {
    const hazardSentence = structuredOutput.hazards.length
      ? `Key hazards: ${this.joinList(
          structuredOutput.hazards
            .slice(0, 3)
            .map((hazard) => this.humanizeLabel(hazard.type)),
        )}.`
      : 'No major hazards were identified from the available inputs.';

    return this.truncateForPrompt(
      `${structuredOutput.notification} ${hazardSentence} ${structuredOutput.recommendedAction}`,
      220,
    );
  }

  private buildDigestSummary(
    notice: string,
    hazards: DerivedHazard[],
    alerts: NpsAlert[],
    weather: ParkWeather | null,
  ): string {
    const topHazard = hazards[0];
    if (topHazard) {
      return this.truncateForPrompt(
        `${notice} ${topHazard.summary} Check the latest trail and access conditions before you head out.`,
        220,
      );
    }

    const topAlert = alerts[0];
    if (topAlert) {
      return this.truncateForPrompt(
        `${notice} ${this.cleanSummaryText(topAlert.description)} Plan around this alert before starting your visit.`,
        220,
      );
    }

    const forecast = weather?.forecast[0];
    if (forecast) {
      return this.truncateForPrompt(
        `${notice} Expect ${forecast.shortForecast.toLowerCase()} with winds ${forecast.windSpeed}.`,
        220,
      );
    }

    return this.truncateForPrompt(notice, 220);
  }

  private cleanSummaryText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private describeLocalFailure(result: LocalModelResult | null): string | null {
    if (!result || result.ok) {
      return null;
    }

    if (result.errors.length) {
      return `Local model failed: ${result.errors.join('; ')}`;
    }

    return 'Local model failed validation.';
  }

  private combineGenerationErrors(
    ...values: Array<string | null>
  ): string | null {
    const nonEmpty = values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
    return nonEmpty.length ? nonEmpty.join(' | ') : null;
  }

  private digestCacheKey(parkSlug: string): string {
    const trailSlugs =
      getStaticParkBySlug(parkSlug)?.trails.map((trail) => trail.slug) ?? [];
    return buildDigestCacheKey(parkSlug, trailSlugs);
  }

  private rememberDigest(cacheKey: string, value: ParkDigestResult): void {
    const today = utcDayStamp();
    for (const key of this.digestCache.keys()) {
      if (!key.startsWith(`${today}:`)) {
        this.digestCache.delete(key);
      }
    }
    this.digestCache.set(cacheKey, value);
  }

  private readDeepseekApiKey(): string {
    const value = this.configService.get<string>('DEEPSEEK_API_KEY');
    return typeof value === 'string' ? value.trim() : '';
  }

  private getDailyLimit(): number {
    const raw = this.configService.get<string | number>('DEEPSEEK_DAILY_LIMIT');
    if (raw === undefined || raw === null || raw === '') {
      return DEFAULT_DEEPSEEK_DAILY_LIMIT;
    }

    const parsed = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return DEFAULT_DEEPSEEK_DAILY_LIMIT;
    }

    return Math.floor(parsed);
  }

  private getMaxOutputTokens(): number {
    const raw = this.configService.get<string | number>(
      'DEEPSEEK_MAX_OUTPUT_TOKENS',
    );
    if (raw === undefined || raw === null || raw === '') {
      return DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS;
    }

    const parsed = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    return clampMaxOutputTokens(parsed);
  }

  private getModelName(): string {
    const configured = this.configService.get<string>('DEEPSEEK_MODEL')?.trim();
    return configured || DEFAULT_DEEPSEEK_MODEL;
  }

  private safeErrorMessage(error: unknown): string {
    const raw =
      error instanceof Error ? error.message : 'Unknown DeepSeek error';
    return redactSecret(raw, this.readDeepseekApiKey());
  }

  private getEffectiveLocalDigestBudgetMs(localTimeoutMs: number): number {
    const digestTimeoutMs = this.getDigestGenerationTimeoutMs();
    const minimumCompatibleBudgetMs = localTimeoutMs + 10000;

    if (digestTimeoutMs < minimumCompatibleBudgetMs) {
      this.logger.warn(
        `DIGEST_GENERATION_TIMEOUT_MS=${digestTimeoutMs}ms is shorter than the local model timeout budget (${localTimeoutMs}ms). Using ${minimumCompatibleBudgetMs}ms so local generation can finish cleanly.`,
      );
      return minimumCompatibleBudgetMs;
    }

    return digestTimeoutMs;
  }

  private getDigestGenerationTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('DIGEST_GENERATION_TIMEOUT_MS') ?? 210000,
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 210000;
  }

  private async generateAskAnswerWithLogging(
    flow: 'ask' | 'digest',
    parkSlug: string,
    dto: AskDto,
    context: RagDocument[],
    notice: string,
    timeoutMs?: number,
  ): Promise<string> {
    const startedAt = Date.now();
    this.logger.log(
      `[${flow}] Starting DeepSeek fallback for "${parkSlug}" model=${this.getModelName()}${timeoutMs ? ` timeout=${timeoutMs}ms` : ''}.`,
    );

    try {
      const answer = timeoutMs
        ? await this.withTimeout(
            this.generateAskAnswer(dto, context, notice),
            timeoutMs,
            `DeepSeek ${flow} generation timed out after ${timeoutMs}ms`,
          )
        : await this.generateAskAnswer(dto, context, notice);

      this.logger.log(
        `[${flow}] DeepSeek fallback succeeded for "${parkSlug}" in ${Date.now() - startedAt}ms.`,
      );
      return answer;
    } catch (error) {
      const message = this.safeErrorMessage(error);
      this.logger.warn(
        `[${flow}] DeepSeek fallback failed for "${parkSlug}" after ${Date.now() - startedAt}ms: ${message}`,
      );
      throw new Error(message);
    }
  }

  private logRulesFallback(
    flow: 'ask' | 'digest',
    parkSlug: string,
    reason: string,
  ): void {
    this.logger.warn(
      `[${flow}] Returning rules fallback for "${parkSlug}": ${reason}`,
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = `Timed out after ${timeoutMs}ms`,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      );
    });
  }

  private truncateForPrompt(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3).trim()}...`;
  }

  private normalizeForecastTemperature(
    temperature: number | null | undefined,
    unit: string | null | undefined,
  ): number | null {
    if (typeof temperature !== 'number') {
      return null;
    }

    if (unit?.toUpperCase() === 'C') {
      return temperature * (9 / 5) + 32;
    }

    return temperature;
  }

  private toCelsius(temperatureF: number | null): number | null {
    if (temperatureF === null) {
      return null;
    }

    return Number((((temperatureF - 32) * 5) / 9).toFixed(1));
  }

  private humanizeParkSlug(parkSlug: string): string {
    return parkSlug
      .split('-')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private humanizeLabel(value: string): string {
    const labelMap: Record<string, string> = {
      SNOW_ICE: 'snow and ice',
      AIR_QUALITY: 'air quality',
      HIGH_WIND: 'high wind',
      TRAIL_CLOSURE: 'trail closures',
      COASTAL_HAZARD: 'coastal hazards',
    };

    return labelMap[value] ?? value.replace(/_/g, ' ').toLowerCase();
  }

  private joinList(values: string[]): string {
    if (!values.length) {
      return '';
    }

    if (values.length === 1) {
      return values[0];
    }

    if (values.length === 2) {
      return `${values[0]} and ${values[1]}`;
    }

    return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
  }

  private isUsableAnswer(answer: string): boolean {
    if (answer.length < 80) {
      return false;
    }

    return /[.!?]/.test(answer);
  }
}
