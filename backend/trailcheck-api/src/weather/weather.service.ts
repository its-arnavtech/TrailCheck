import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  // Maps park slugs to lat/lng for NWS API
  private readonly parkCoordinates: Record<string, { lat: number; lng: number }> = {
    yosemite: { lat: 37.8651, lng: -119.5383 },
    zion: { lat: 37.2982, lng: -113.0263 },
    yellowstone: { lat: 44.4280, lng: -110.5885 },
    'yellowstone-idaho': { lat: 44.4280, lng: -110.5885 },
    'yellowstone-montana': { lat: 44.4280, lng: -110.5885 },
    'yellowstone-wyoming': { lat: 44.4280, lng: -110.5885 },
    'grand-canyon': { lat: 36.1069, lng: -112.1129 },
    acadia: { lat: 44.3386, lng: -68.2733 },
    'big-bend': { lat: 29.1275, lng: -103.2425 },
  };

  async getWeatherForPark(parkSlug: string): Promise<ParkWeather | null> {
    const coords = this.parkCoordinates[parkSlug];

    if (!coords) {
      this.logger.warn(`No coordinates found for slug: ${parkSlug}`);
      return null;
    }

    try {
      // Step 1: NWS points API — get the forecast office + grid for these coords
      const pointsRes = await fetch(
        `https://api.weather.gov/points/${coords.lat},${coords.lng}`,
        { headers: { 'User-Agent': 'TrailPulse/1.0 (contact@trailpulse.dev)' } }
      );

      if (!pointsRes.ok) {
        this.logger.error(`NWS points API error: ${pointsRes.status}`);
        return null;
      }

      const pointsData = await pointsRes.json();
      const forecastUrl = pointsData.properties?.forecast;

      if (!forecastUrl) return null;

      // Step 2: fetch the actual forecast
      const forecastRes = await fetch(forecastUrl, {
        headers: { 'User-Agent': 'TrailPulse/1.0 (contact@trailpulse.dev)' },
      });

      if (!forecastRes.ok) {
        this.logger.error(`NWS forecast API error: ${forecastRes.status}`);
        return null;
      }

      const forecastData = await forecastRes.json();
      const periods = forecastData.properties?.periods ?? [];

      // Return just the next 3 forecast periods
      return {
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
      };
    } catch (error) {
      this.logger.error('Failed to fetch NWS weather', error);
      return null;
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
