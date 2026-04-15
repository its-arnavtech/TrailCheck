import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
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
  generationSource: 'local' | 'gemini' | 'fallback';
  generationError: string | null;
  structuredOutput: LocalStructuredOutput | null;
  hazards: DerivedHazard[];
  hazardAssessment: SeasonalHazardAssessment;
  alerts: NpsAlert[];
  weather: ParkWeather | null;
  context: RagDocument[];
}

export interface ParkDigestResult {
  parkSlug: string;
  shortSummary: string;
  notification: string;
  generationSource: 'local' | 'gemini' | 'fallback';
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
  private aiClient: GoogleGenAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly npsService: NpsService,
    private readonly weatherService: WeatherService,
    private readonly hazardsService: HazardsService,
    private readonly prisma: PrismaService,
    private readonly localModelService: LocalModelService,
  ) {}

  async ask(dto: AskDto): Promise<AskResponse> {
    const { parkName, alerts, weather, hazardAssessment, hazards, context } =
      await this.collectParkContext(dto.parkSlug);
    const fallbackNotice = this.hazardsService.buildNotice(
      hazardAssessment,
      weather,
    );
    const localResult = await this.tryLocalStructuredOutput({
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

    if (!this.isGeminiConfigured()) {
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
          'GEMINI_API_KEY is missing',
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
      const answer = await this.generateAskAnswer(dto, context, fallbackNotice);

      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer,
        notice: fallbackNotice,
        generationSource: 'gemini',
        generationError: localFailureMessage,
        structuredOutput: null,
        hazards,
        hazardAssessment,
        alerts,
        weather,
        context,
      };
    } catch (error) {
      this.logger.error(
        'Gemini ask flow failed, returning fallback answer.',
        error,
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
          error instanceof Error ? error.message : 'Unknown Gemini error',
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
    const askResponse = await this.ask({
      parkSlug,
      question:
        'What important conditions and hazards should visitors know right now?',
    });

    const shortSummary = askResponse.structuredOutput
      ? this.buildDigestSummaryFromStructuredOutput(
          askResponse.structuredOutput,
        )
      : this.buildDigestSummary(
          askResponse.notice,
          askResponse.hazards,
          askResponse.alerts,
          askResponse.weather,
        );
    const notification = askResponse.structuredOutput
      ? this.truncateForPrompt(askResponse.structuredOutput.notification, 160)
      : this.truncateForPrompt(askResponse.notice, 160);

    return {
      parkSlug,
      shortSummary,
      notification,
      generationSource: askResponse.generationSource,
      generationError: askResponse.generationError,
      structuredOutput: askResponse.structuredOutput,
      retrievedContext: askResponse.context,
      hazards: askResponse.hazards,
      hazardAssessment: askResponse.hazardAssessment,
      alerts: askResponse.alerts,
      weather: askResponse.weather,
    };
  }

  isGeminiConfigured(): boolean {
    return Boolean(this.configService.get<string>('GEMINI_API_KEY'));
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
      try {
        await this.prisma.parkSnapshot.create({
          data: {
            parkId: parkRecord.id,
            npsRaw: this.toSnapshotJsonValue(npsPayload.raw),
            nwsRaw: this.toSnapshotJsonValue(weatherPayload.raw),
          },
        });
      } catch (error) {
        this.logger.warn(
          `Skipping park snapshot persistence for "${parkSlug}": ${
            error instanceof Error ? error.message : 'Unknown snapshot error'
          }`,
        );
      }
    } else {
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
    const result = await this.getClient().models.generateContent({
      model: this.getModelName(),
      contents: this.buildAskPrompt(dto, context, notice),
      config: {
        temperature: 0,
        topP: 0.9,
        maxOutputTokens: 320,
      },
    });

    const answer = result.text?.trim();

    if (!answer) {
      throw new Error('Gemini returned an empty answer.');
    }

    if (!this.isUsableAnswer(answer)) {
      throw new Error('Gemini returned an incomplete answer.');
    }

    return answer;
  }

  private async tryLocalStructuredOutput(params: {
    parkSlug: string;
    parkName: string;
    alerts: NpsAlert[];
    weather: ParkWeather | null;
    hazardAssessment: SeasonalHazardAssessment;
    hazards: DerivedHazard[];
  }): Promise<LocalModelResult | null> {
    if (!this.localModelService.isEnabled()) {
      return null;
    }

    const localInput = this.buildLocalModelInput(params);
    return this.localModelService.generate(localInput);
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
      .map(
        (doc, index) =>
          `${index + 1}. [${doc.source.toUpperCase()}] ${doc.title}\n${doc.content}`,
      )
      .join('\n\n');

    return [
      'You are TrailCheck, a park conditions assistant.',
      'Answer using only the context provided from NPS alerts, NWS weather, and derived hazards.',
      'Do not invent closures, warnings, or park conditions.',
      'Write 2 to 4 complete sentences.',
      'Keep the answer concise, practical, and specific to the visitor question.',
      'Lead with the most important safety or access impact.',
      'If roads are closed or weather may affect access, say that directly.',
      'End with one practical next step for the visitor.',
      'If the available context is limited, say that directly.',
      `Park: ${dto.parkSlug}`,
      `Visitor question: ${dto.question}`,
      `Current notice: ${notice}`,
      'Structured context:',
      serializedContext || 'No context available.',
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

  private getClient(): GoogleGenAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('Missing GEMINI_API_KEY');
    }

    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({ apiKey });
    }

    return this.aiClient;
  }

  private getModelName(): string {
    return this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
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
