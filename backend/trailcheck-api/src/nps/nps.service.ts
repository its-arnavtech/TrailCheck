import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getParkMetadata } from '../parks/park-registry';

type AlertsPayload = {
  parkCode: string | null;
  raw: unknown;
  alerts: NpsAlert[];
};

@Injectable()
export class NpsService {
  private readonly logger = new Logger(NpsService.name);
  private readonly baseUrl = 'https://developer.nps.gov/api/v1';
  private readonly cacheTtlMs = 1000 * 60 * 10;
  private readonly requestTimeoutMs = 3500;
  private readonly payloadCache = new Map<
    string,
    { expiresAt: number; value: AlertsPayload }
  >();
  private readonly inFlightPayloads = new Map<string, Promise<AlertsPayload>>();

  constructor(private config: ConfigService) {}

  async getAlertsForPark(parkSlug: string): Promise<NpsAlert[]> {
    const payload = await this.getAlertsPayloadForPark(parkSlug);
    return payload.alerts;
  }

  async getAlertsPayloadForPark(parkSlug: string): Promise<AlertsPayload> {
    const cached = this.payloadCache.get(parkSlug);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const existingRequest = this.inFlightPayloads.get(parkSlug);
    if (existingRequest) {
      return existingRequest;
    }

    const request = this.fetchAlertsPayload(parkSlug)
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

  private async fetchAlertsPayload(parkSlug: string): Promise<AlertsPayload> {
    const parkCode = getParkMetadata(parkSlug)?.parkCode ?? null;

    if (!parkCode) {
      this.logger.warn(`No NPS park code found for slug: ${parkSlug}`);
      return { parkCode: null, raw: null, alerts: [] };
    }

    const apiKey = this.config.get<string>('NPS_API_KEY');
    const url = `${this.baseUrl}/alerts?parkCode=${parkCode}&api_key=${apiKey}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });

      if (!response.ok) {
        this.logger.error(`NPS API error: ${response.status}`);
        return { parkCode, raw: null, alerts: [] };
      }

      const data = await response.json();
      return {
        parkCode,
        raw: data,
        alerts: this.mapToNpsAlerts(data.data ?? []),
      };
    } catch (error) {
      this.logger.error('Failed to fetch NPS alerts', error);
      return { parkCode, raw: null, alerts: [] };
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
