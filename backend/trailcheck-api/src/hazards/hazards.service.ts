import { Injectable } from '@nestjs/common';
import { NpsAlert } from '../nps/nps.service';
import { ParkWeather } from '../weather/weather.service';

export interface DerivedHazard {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high';
  source: 'nps' | 'nws' | 'combined';
  summary: string;
  evidence: string[];
  tags: string[];
}

@Injectable()
export class HazardsService {
  deriveHazards(alerts: NpsAlert[], weather: ParkWeather | null): DerivedHazard[] {
    const hazards: DerivedHazard[] = [];

    for (const alert of alerts) {
      const haystack = `${alert.title} ${alert.description} ${alert.category}`.toLowerCase();
      const tags = this.extractTags(haystack);

      hazards.push({
        id: `nps-${alert.id}`,
        title: alert.title,
        severity: this.deriveSeverity(haystack),
        source: 'nps',
        summary: `${alert.category}: ${this.truncate(alert.description, 220)}`,
        evidence: [alert.title, this.truncate(alert.description, 240)],
        tags,
      });
    }

    const forecastHazard = this.deriveWeatherHazard(weather);
    if (forecastHazard) {
      hazards.push(forecastHazard);
    }

    return hazards.sort((a, b) => this.severityRank(b.severity) - this.severityRank(a.severity));
  }

  buildNotice(hazards: DerivedHazard[], weather: ParkWeather | null): string {
    const topHazard = hazards[0];

    if (topHazard) {
      return `${topHazard.title}. Review current conditions before heading out.`;
    }

    const firstForecast = weather?.forecast[0];
    if (firstForecast) {
      return `${firstForecast.name}: ${firstForecast.shortForecast} with winds ${firstForecast.windSpeed}.`;
    }

    return 'Current park conditions are available, but no notable hazards were identified.';
  }

  private deriveWeatherHazard(weather: ParkWeather | null): DerivedHazard | null {
    const firstRelevantPeriod = weather?.forecast.find((period) => {
      const haystack = `${period.shortForecast} ${period.detailedForecast} ${period.windSpeed}`.toLowerCase();
      return ['snow', 'thunder', 'storm', 'wind', 'rain', 'ice', 'heat'].some((keyword) =>
        haystack.includes(keyword),
      );
    });

    if (!firstRelevantPeriod) {
      return null;
    }

    const haystack =
      `${firstRelevantPeriod.shortForecast} ${firstRelevantPeriod.detailedForecast} ${firstRelevantPeriod.windSpeed}`.toLowerCase();

    return {
      id: `nws-${weather?.parkSlug ?? 'park'}-${firstRelevantPeriod.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: `${firstRelevantPeriod.name} weather hazard`,
      severity: this.deriveSeverity(haystack),
      source: 'nws',
      summary: `${firstRelevantPeriod.shortForecast} expected with winds ${firstRelevantPeriod.windSpeed}.`,
      evidence: [
        firstRelevantPeriod.shortForecast,
        this.truncate(firstRelevantPeriod.detailedForecast, 240),
      ],
      tags: this.extractTags(haystack),
    };
  }

  private deriveSeverity(value: string): 'low' | 'moderate' | 'high' {
    if (
      ['closure', 'closed', 'flood', 'fire', 'evacu', 'warning', 'severe', 'thunder', 'ice'].some(
        (keyword) => value.includes(keyword),
      )
    ) {
      return 'high';
    }

    if (
      ['snow', 'wind', 'rain', 'chain', 'caution', 'advisory', 'cold', 'heat'].some((keyword) =>
        value.includes(keyword),
      )
    ) {
      return 'moderate';
    }

    return 'low';
  }

  private extractTags(value: string): string[] {
    const tags = [
      'closure',
      'snow',
      'wind',
      'rain',
      'ice',
      'fire',
      'flood',
      'storm',
      'chains',
      'road',
    ].filter((tag) => value.includes(tag));

    return tags.length ? tags : ['general'];
  }

  private severityRank(severity: DerivedHazard['severity']): number {
    return { low: 1, moderate: 2, high: 3 }[severity];
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3).trim()}...`;
  }
}
