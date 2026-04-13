import { Injectable, Logger } from '@nestjs/common';
import { getParkMetadata } from '../parks/park-registry';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async getWeatherForPark(parkSlug: string): Promise<ParkWeather | null> {
    const payload = await this.getWeatherPayloadForPark(parkSlug);
    return payload.weather;
  }

  async getWeatherPayloadForPark(parkSlug: string): Promise<{
    raw: unknown;
    weather: ParkWeather | null;
  }> {
    const park = getParkMetadata(parkSlug);

    if (!park) {
      this.logger.warn(`No coordinates found for slug: ${parkSlug}`);
      return { raw: null, weather: null };
    }

    try {
      const pointsRes = await fetch(`https://api.weather.gov/points/${park.lat},${park.lng}`, {
        headers: { 'User-Agent': 'TrailCheck/1.0 (contact@trailcheck.dev)' },
      });

      if (!pointsRes.ok) {
        this.logger.error(`NWS points API error: ${pointsRes.status}`);
        return { raw: null, weather: null };
      }

      const pointsData = await pointsRes.json();
      const forecastUrl = pointsData.properties?.forecast;

      if (!forecastUrl) {
        return {
          raw: { points: pointsData, forecast: null },
          weather: null,
        };
      }

      const forecastRes = await fetch(forecastUrl, {
        headers: { 'User-Agent': 'TrailCheck/1.0 (contact@trailcheck.dev)' },
      });

      if (!forecastRes.ok) {
        this.logger.error(`NWS forecast API error: ${forecastRes.status}`);
        return {
          raw: { points: pointsData, forecast: null },
          weather: null,
        };
      }

      const forecastData = await forecastRes.json();
      const periods = forecastData.properties?.periods ?? [];

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
      this.logger.error('Failed to fetch NWS weather', error);
      return { raw: null, weather: null };
    }
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
