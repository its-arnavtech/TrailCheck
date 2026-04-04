import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AskDto } from './dto/ask.dto';
import { HazardsService, type DerivedHazard } from '../hazards/hazards.service';
import { NpsAlert, NpsService } from '../nps/nps.service';
import { ParkWeather, WeatherService } from '../weather/weather.service';

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
  generationSource: 'gemini' | 'fallback';
  generationError: string | null;
  hazards: DerivedHazard[];
  alerts: NpsAlert[];
  weather: ParkWeather | null;
  context: RagDocument[];
}

export interface ParkDigestResult {
  parkSlug: string;
  shortSummary: string;
  notification: string;
  generationSource: 'gemini' | 'fallback';
  generationError: string | null;
  retrievedContext: RagDocument[];
  hazards: DerivedHazard[];
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
  ) {}

  async ask(dto: AskDto): Promise<AskResponse> {
    const { alerts, weather, hazards, context } = await this.collectParkContext(dto.parkSlug);
    const notice = this.hazardsService.buildNotice(hazards, weather);

    if (!this.isGeminiConfigured()) {
      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer: this.buildFallbackAnswer(dto.question, hazards, alerts, weather),
        notice,
        generationSource: 'fallback',
        generationError: 'GEMINI_API_KEY is missing',
        hazards,
        alerts,
        weather,
        context,
      };
    }

    try {
      const answer = await this.generateAskAnswer(dto, context, notice);

      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer,
        notice,
        generationSource: 'gemini',
        generationError: null,
        hazards,
        alerts,
        weather,
        context,
      };
    } catch (error) {
      this.logger.error('Gemini ask flow failed, returning fallback answer.', error);

      return {
        parkSlug: dto.parkSlug,
        question: dto.question,
        answer: this.buildFallbackAnswer(dto.question, hazards, alerts, weather),
        notice,
        generationSource: 'fallback',
        generationError: error instanceof Error ? error.message : 'Unknown Gemini error',
        hazards,
        alerts,
        weather,
        context,
      };
    }
  }

  async generateParkDigest(parkSlug: string): Promise<ParkDigestResult> {
    const askResponse = await this.ask({
      parkSlug,
      question: 'What important conditions and hazards should visitors know right now?',
    });

    return {
      parkSlug,
      shortSummary: this.buildDigestSummary(
        askResponse.notice,
        askResponse.hazards,
        askResponse.alerts,
        askResponse.weather,
      ),
      notification: this.truncateForPrompt(askResponse.notice, 160),
      generationSource: askResponse.generationSource,
      generationError: askResponse.generationError,
      retrievedContext: askResponse.context,
      hazards: askResponse.hazards,
      alerts: askResponse.alerts,
      weather: askResponse.weather,
    };
  }

  isGeminiConfigured(): boolean {
    return Boolean(this.configService.get<string>('GEMINI_API_KEY'));
  }

  private async collectParkContext(parkSlug: string): Promise<{
    alerts: NpsAlert[];
    weather: ParkWeather | null;
    hazards: DerivedHazard[];
    context: RagDocument[];
  }> {
    const [alerts, weather] = await Promise.all([
      this.npsService.getAlertsForPark(parkSlug),
      this.weatherService.getWeatherForPark(parkSlug),
    ]);

    const hazards = this.hazardsService.deriveHazards(alerts, weather);
    const context = this.buildContext({ parkSlug, alerts, weather, hazards });

    return { alerts, weather, hazards, context };
  }

  private async generateAskAnswer(dto: AskDto, context: RagDocument[], notice: string): Promise<string> {
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

  private buildContext(params: {
    parkSlug: string;
    alerts: NpsAlert[];
    weather: ParkWeather | null;
    hazards: DerivedHazard[];
  }): RagDocument[] {
    const hazardDocs = params.hazards.map((hazard) => ({
      id: hazard.id,
      source: 'hazard' as const,
      title: hazard.title,
      content: `${hazard.severity.toUpperCase()} hazard. ${hazard.summary}`,
      metadata: {
        severity: hazard.severity,
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

    return [...hazardDocs, ...alertDocs, ...weatherDocs].slice(0, 10);
  }

  private buildAskPrompt(dto: AskDto, context: RagDocument[], notice: string): string {
    const serializedContext = context
      .map((doc, index) => `${index + 1}. [${doc.source.toUpperCase()}] ${doc.title}\n${doc.content}`)
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

  private isUsableAnswer(answer: string): boolean {
    if (answer.length < 80) {
      return false;
    }

    return /[.!?]/.test(answer);
  }
}
