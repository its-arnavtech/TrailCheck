import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NpsService {
  private readonly logger = new Logger(NpsService.name);
  private readonly baseUrl = 'https://developer.nps.gov/api/v1';

  // Maps your DB park slugs to NPS park codes
  private readonly parkCodeMap: Record<string, string> = {
    yosemite: 'yose',
    zion: 'zion',
    yellowstone: 'yell',
    'grand-canyon': 'grca',
    acadia: 'acad',
    'big-bend': 'bibe',
  };

  constructor(private config: ConfigService) {}

  async getAlertsForPark(parkSlug: string): Promise<NpsAlert[]> {
    const parkCode = this.parkCodeMap[parkSlug];

    if (!parkCode) {
      this.logger.warn(`No NPS park code found for slug: ${parkSlug}`);
      return [];
    }

    const apiKey = this.config.get<string>('NPS_API_KEY');
    const url = `${this.baseUrl}/alerts?parkCode=${parkCode}&api_key=${apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(`NPS API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return this.mapToNpsAlerts(data.data ?? []);
    } catch (error) {
      this.logger.error('Failed to fetch NPS alerts', error);
      return [];
    }
  }

  private mapToNpsAlerts(raw: any[]): NpsAlert[] {
    return raw.map((alert) => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      category: alert.category,
      url: alert.url,
      parkCode: alert.parkCode,
    }));
  }
}

export interface NpsAlert {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  parkCode: string;
}