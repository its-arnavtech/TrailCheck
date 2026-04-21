import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getParkMetadata } from '../parks/park-registry';

type WeatherPayload = {
  raw: unknown;
  weather: ParkWeather | null;
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cacheTtlMs = 1000 * 60 * 10;
  private readonly payloadCache = new Map<
    string,
    { expiresAt: number; value: WeatherPayload }
  >();
  private readonly inFlightPayloads = new Map<string, Promise<WeatherPayload>>();

  constructor(private readonly configService: ConfigService) {}

  async getWeatherForPark(parkSlug: string): Promise<ParkWeather | null> {
    const payload = await this.getWeatherPayloadForPark(parkSlug);
    return payload.weather;
  }

  async getWeatherPayloadForPark(parkSlug: string): Promise<WeatherPayload> {
    const cached = this.payloadCache.get(parkSlug);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const existingRequest = this.inFlightPayloads.get(parkSlug);
    if (existingRequest) {
      return existingRequest;
    }

    const request = this.fetchWeatherPayload(parkSlug)
      .then((value) => {
        this.payloadCache.set(parkSlug, {
          value,
          expiresAt: Date.now() + this.cacheTtlMs,
        });
        return value;
      })
      .finally(() => {
        this.inFlightPayloads.delete(parkSlug);
      });

    this.inFlightPayloads.set(parkSlug, request);

    return request;
  }

  private async fetchWeatherPayload(parkSlug: string): Promise<WeatherPayload> {
    const park = getParkMetadata(parkSlug);

    if (!park) {
      this.logger.warn(`No coordinates found for slug: ${parkSlug}`);
      return { raw: null, weather: null };
    }

    try {
      const pointsData = await this.fetchJsonWithTimeout(
        `https://api.weather.gov/points/${park.lat},${park.lng}`,
        parkSlug,
        'points',
      );

      if (!pointsData) {
        this.logger.warn(
          `Proceeding without weather for "${parkSlug}" because the NWS points lookup did not complete successfully.`,
        );
        return { raw: null, weather: null };
      }
      const forecastUrl = pointsData.properties?.forecast;

      if (!forecastUrl) {
        this.logger.warn(
          `Proceeding without weather for "${parkSlug}" because the NWS points response did not include a forecast URL.`,
        );
        return {
          raw: { points: pointsData, forecast: null },
          weather: null,
        };
      }

      const forecastData = await this.fetchJsonWithTimeout(
        forecastUrl,
        parkSlug,
        'forecast',
      );
      if (!forecastData) {
        this.logger.warn(
          `Proceeding without weather for "${parkSlug}" because the NWS forecast lookup did not complete successfully.`,
        );
        return {
          raw: { points: pointsData, forecast: null },
          weather: null,
        };
      }

      const periods = forecastData.properties?.periods ?? [];
      this.logger.log(
        `Weather fetch for "${parkSlug}" completed successfully with ${periods.slice(0, 6).length} forecast periods.`,
      );

      return {
        raw: {
          points: pointsData,
          forecast: forecastData,
        },
        weather: {
          parkSlug,
          forecast: periods.slice(0, 6).map((p: any) => ({
            name: p.name,
            temperature: p.temperature,
            temperatureUnit: p.temperatureUnit,
            windSpeed: p.windSpeed,
            shortForecast: p.shortForecast,
            detailedForecast: p.detailedForecast,
            icon: p.icon,
          })),
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown weather error';
      this.logger.error(
        `Unexpected weather fetch failure for "${parkSlug}": ${message}`,
      );
      return { raw: null, weather: null };
    }
  }

  private getRequestTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('WEATHER_REQUEST_TIMEOUT_MS') ?? 3000,
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 3000;
  }

  private async fetchJsonWithTimeout(
    url: string,
    parkSlug: string,
    stage: 'points' | 'forecast',
  ): Promise<any | null> {
    const timeoutMs = this.getRequestTimeoutMs();
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'TrailCheck/1.0 (contact@trailcheck.dev)' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const elapsedMs = Date.now() - startedAt;

      if (!response.ok) {
        this.logger.warn(
          `Weather ${stage} request for "${parkSlug}" failed with status ${response.status} after ${elapsedMs}ms.`,
        );
        return null;
      }

      const data = await response.json();
      this.logger.log(
        `Weather ${stage} request for "${parkSlug}" succeeded in ${elapsedMs}ms.`,
      );
      return data;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const message =
        error instanceof Error ? error.message : 'Unknown weather fetch error';

      if (this.isTimeoutError(error)) {
        this.logger.warn(
          `Weather ${stage} request for "${parkSlug}" timed out after ${elapsedMs}ms (budget ${timeoutMs}ms).`,
        );
        return null;
      }

      this.logger.error(
        `Weather ${stage} request for "${parkSlug}" failed after ${elapsedMs}ms: ${message}`,
      );
      return null;
    }
  }

  private isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timed out')
    );
  }
}

export interface WeatherPeriod {
  name: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  shortForecast: string;
  detailedForecast: string;
  icon: string;
}

export interface ParkWeather {
  parkSlug: string;
  forecast: WeatherPeriod[];
}
