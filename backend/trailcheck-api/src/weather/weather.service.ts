import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  // Maps park slugs to lat/lng for NWS API
  private readonly parkCoordinates: Record<string, { lat: number; lng: number }> = {
    yosemite: { lat: 37.8651, lng: -119.5383 },
    zion: { lat: 37.2982, lng: -113.0263 },
    yellowstone: { lat: 44.428, lng: -110.5885 },
    'grand-canyon': { lat: 36.1069, lng: -112.1129 },
    acadia: { lat: 44.3386, lng: -68.2733 },
    'big-bend': { lat: 29.1275, lng: -103.2425 },
  };

  async getWeatherForPark(parkSlug: string): Promise<ParkWeather | null> {
    const payload = await this.getWeatherPayloadForPark(parkSlug);
    return payload.weather;
  }

  async getWeatherPayloadForPark(parkSlug: string): Promise<{
    raw: unknown;
    weather: ParkWeather | null;
  }> {
    const coords = this.parkCoordinates[parkSlug];

    if (!coords) {
      this.logger.warn(`No coordinates found for slug: ${parkSlug}`);
      return { raw: null, weather: null };
    }

    try {
      const pointsRes = await fetch(`https://api.weather.gov/points/${coords.lat},${coords.lng}`, {
        headers: { 'User-Agent': 'TrailPulse/1.0 (contact@trailpulse.dev)' },
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
        headers: { 'User-Agent': 'TrailPulse/1.0 (contact@trailpulse.dev)' },
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
          forecast: periods.slice(0, 3).map((p: any) => ({
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
