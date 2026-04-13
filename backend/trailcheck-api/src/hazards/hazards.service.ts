import { Injectable } from '@nestjs/common';
import {
  HAZARD_DEFINITIONS,
  type HazardDefinition,
} from './hazard-definitions';
import { HAZARD_PROFILES } from './hazard-profiles';
import { resolveSeason } from './season.util';
import { getParkMetadata, type ParkMetadata } from '../parks/park-registry';
import { NpsAlert } from '../nps/nps.service';
import { ParkWeather } from '../weather/weather.service';
import type {
  DerivedHazard,
  DerivedWeatherFeatures,
  HazardRuleSetting,
  HazardSeverity,
  HazardSignal,
  HazardType,
  Season,
  SeasonalHazardAssessment,
} from './hazard.types';

const DEFAULT_PROFILE = HAZARD_PROFILES.temperate_forest;
const HAZARD_TYPES = Object.keys(HAZARD_DEFINITIONS) as HazardType[];

@Injectable()
export class HazardsService {
  assessParkHazards(
    parkSlug: string,
    alerts: NpsAlert[],
    weather: ParkWeather | null,
    asOf = new Date(),
  ): SeasonalHazardAssessment {
    const park = this.getParkMetadataOrFallback(parkSlug);
    const season = resolveSeason(asOf, park.hemisphere);
    const profile = HAZARD_PROFILES[park.hazardProfile] ?? DEFAULT_PROFILE;
    const seasonalRules = this.buildSeasonRules(park, season);
    const weatherFeatures = this.deriveWeatherFeatures(weather);

    const activeHazards = HAZARD_TYPES.flatMap((type) => {
      const definition = HAZARD_DEFINITIONS[type];
      const rule = seasonalRules[type];
      const weatherSignal = definition.evaluateWeather({
        park,
        season,
        weatherFeatures,
      });
      const alertSignal = this.evaluateAlertSignal(definition, alerts);
      const derived = this.buildDerivedHazard({
        parkSlug,
        season,
        profile: profile.id,
        definition,
        rule,
        weatherSignal,
        alertSignal,
      });

      return derived ? [derived] : [];
    }).sort((left, right) => this.compareHazards(right, left));

    const activeTypes = new Set(activeHazards.map((hazard) => hazard.type));
    const ignoredHazards = HAZARD_TYPES.filter(
      (type) =>
        seasonalRules[type].priority === 'ignore' && !activeTypes.has(type),
    );

    return {
      parkSlug,
      parkCode: park.parkCode,
      season,
      profile: profile.id,
      riskLevel: this.deriveRiskLevel(activeHazards),
      activeHazards,
      ignoredHazards,
      weatherFeatures,
    };
  }

  deriveHazards(
    parkSlug: string,
    alerts: NpsAlert[],
    weather: ParkWeather | null,
    asOf = new Date(),
  ): DerivedHazard[] {
    return this.assessParkHazards(parkSlug, alerts, weather, asOf)
      .activeHazards;
  }

  buildNotice(
    assessment: SeasonalHazardAssessment,
    weather: ParkWeather | null,
  ): string {
    const topHazard = assessment.activeHazards[0];

    if (topHazard) {
      return `${topHazard.title}. ${topHazard.reason}`;
    }

    const firstForecast = weather?.forecast[0];
    if (firstForecast) {
      return `${assessment.season} ${assessment.profile.replace(/_/g, ' ')} profile: ${firstForecast.shortForecast} with winds ${firstForecast.windSpeed}.`;
    }

    return `No major ${assessment.season} hazards were identified for the ${assessment.profile.replace(/_/g, ' ')} profile.`;
  }

  private getParkMetadataOrFallback(parkSlug: string): ParkMetadata {
    return (
      getParkMetadata(parkSlug) ?? {
        slug: parkSlug,
        parkCode: '',
        lat: 0,
        lng: 0,
        hazardProfile: DEFAULT_PROFILE.id,
        hemisphere: 'north',
      }
    );
  }

  private buildSeasonRules(
    park: ParkMetadata,
    season: Season,
  ): Record<HazardType, HazardRuleSetting> {
    const baseSeasonRules =
      HAZARD_PROFILES[park.hazardProfile]?.seasons[season] ?? {};
    const parkOverrides = park.seasonalOverrides?.[season] ?? {};

    return HAZARD_TYPES.reduce<Record<HazardType, HazardRuleSetting>>(
      (accumulator, type) => {
        accumulator[type] = parkOverrides[type] ??
          baseSeasonRules[type] ?? { priority: 'ignore', weight: 0 };
        return accumulator;
      },
      {} as Record<HazardType, HazardRuleSetting>,
    );
  }

  private deriveWeatherFeatures(
    weather: ParkWeather | null,
  ): DerivedWeatherFeatures {
    const periods = weather?.forecast ?? [];
    const temperatures = periods
      .map((period) =>
        this.normalizeTemperature(period.temperature, period.temperatureUnit),
      )
      .filter((value): value is number => value !== null);
    const textByPeriod = periods.map((period) =>
      `${period.shortForecast} ${period.detailedForecast} ${period.windSpeed}`.toLowerCase(),
    );
    const combinedText = textByPeriod.join(' ');
    const maxWindMph = periods.reduce(
      (highest, period) =>
        Math.max(highest, this.parseWindSpeedMph(period.windSpeed)),
      0,
    );

    const liquidWetPattern =
      /(rain|showers|drizzle|downpour|thunderstorm|thunderstorms)/i;
    const snowPattern = /(snow|flurries|wintry|sleet|blizzard|freezing rain)/i;
    const thunderPattern = /(thunderstorm|thunder|lightning)/i;
    const smokePattern = /(smoke|haze|air quality|air-quality)/i;
    const heavyRainPattern =
      /(heavy rain|excessive rainfall|flash flood|downpour|torrential)/i;
    const hotPattern = /\bhot\b|heat/i;

    const wetPeriods = textByPeriod.filter((value) =>
      liquidWetPattern.test(value),
    ).length;
    const snowPeriods = textByPeriod.filter((value) =>
      snowPattern.test(value),
    ).length;
    const thunderPeriods = textByPeriod.filter((value) =>
      thunderPattern.test(value),
    ).length;
    const smokePeriods = textByPeriod.filter((value) =>
      smokePattern.test(value),
    ).length;
    const hotPeriods = periods.filter(
      (period) =>
        (this.normalizeTemperature(
          period.temperature,
          period.temperatureUnit,
        ) ?? Number.NEGATIVE_INFINITY) >= 90 ||
        hotPattern.test(`${period.shortForecast} ${period.detailedForecast}`),
    ).length;
    const coldPeriods = periods.filter(
      (period) =>
        (this.normalizeTemperature(
          period.temperature,
          period.temperatureUnit,
        ) ?? Number.POSITIVE_INFINITY) <= 32,
    ).length;

    const maxTemperatureF = temperatures.length
      ? Math.max(...temperatures)
      : null;
    const minTemperatureF = temperatures.length
      ? Math.min(...temperatures)
      : null;

    return {
      periodCount: periods.length,
      maxTemperatureF,
      minTemperatureF,
      maxWindMph,
      wetPeriods,
      snowPeriods,
      thunderPeriods,
      smokePeriods,
      hotPeriods,
      coldPeriods,
      freezeThaw:
        maxTemperatureF !== null &&
        minTemperatureF !== null &&
        minTemperatureF <= 32 &&
        maxTemperatureF >= 36,
      heavyRainSignal: heavyRainPattern.test(combinedText),
      sustainedWetPattern: wetPeriods >= 2,
      dryWindSignal:
        (maxTemperatureF ?? Number.NEGATIVE_INFINITY) >= 88 &&
        maxWindMph >= 20 &&
        /(sunny|clear|dry|breezy|windy|red flag)/i.test(combinedText),
      combinedText,
    };
  }

  private evaluateAlertSignal(
    definition: HazardDefinition,
    alerts: NpsAlert[],
  ): HazardSignal | null {
    const matchedAlerts = alerts.filter((alert) => {
      const haystack =
        `${alert.title} ${alert.description} ${alert.category}`.toLowerCase();
      return definition.alertKeywords.some((keyword) =>
        haystack.includes(keyword),
      );
    });

    if (!matchedAlerts.length) {
      return null;
    }

    const combinedText = matchedAlerts
      .map((alert) =>
        `${alert.title} ${alert.description} ${alert.category}`.toLowerCase(),
      )
      .join(' ');

    const severeAlert =
      definition.type === 'TRAIL_CLOSURE' ||
      /(closure|closed|warning|danger|evacuat|emergency|flash flood|wildfire|severe)/i.test(
        combinedText,
      );

    const score = severeAlert ? 92 : 76;
    const reasons: Record<HazardType, string> = {
      HEAT: 'NPS alerts mention heat exposure concerns.',
      DEHYDRATION: 'NPS alerts mention water or dehydration concerns.',
      WILDFIRE: 'NPS alerts mention fire activity or fire restrictions.',
      AIR_QUALITY: 'NPS alerts mention smoke or air quality impacts.',
      SNOW_ICE: 'NPS alerts mention snow, ice, or winter travel concerns.',
      FLOODING: 'NPS alerts mention flooding, washouts, or high water.',
      MUD: 'NPS alerts mention muddy or damaged trail surfaces.',
      HIGH_WIND:
        'NPS alerts mention windy conditions affecting safety or access.',
      LIGHTNING: 'NPS alerts mention storms or lightning impacts.',
      ROCKFALL: 'NPS alerts mention rockfall, debris, or unstable slopes.',
      TRAIL_CLOSURE: 'NPS alerts indicate closures or access restrictions.',
      COLD: 'NPS alerts mention cold exposure concerns.',
      FREEZE_THAW: 'NPS alerts mention freeze-refreeze hazards.',
      SLIPPERY_TRAILS: 'NPS alerts mention slick or slippery trail conditions.',
      COASTAL_HAZARD:
        'NPS alerts mention marine, surf, or tropical weather hazards.',
    };

    return {
      score,
      severity: severeAlert ? 'high' : 'moderate',
      reason: reasons[definition.type],
      evidence: matchedAlerts
        .slice(0, 2)
        .map(
          (alert) => `${alert.title}: ${this.truncate(alert.description, 180)}`,
        ),
      tags: [...definition.tags, 'nps-alert'],
    };
  }

  private buildDerivedHazard(params: {
    parkSlug: string;
    season: Season;
    profile: ParkMetadata['hazardProfile'];
    definition: HazardDefinition;
    rule: HazardRuleSetting;
    weatherSignal: HazardSignal | null;
    alertSignal: HazardSignal | null;
  }): DerivedHazard | null {
    const {
      parkSlug,
      season,
      profile,
      definition,
      rule,
      weatherSignal,
      alertSignal,
    } = params;
    const weightedWeatherScore = weatherSignal
      ? Math.round(weatherSignal.score * rule.weight)
      : 0;
    const shouldActivateFromWeather =
      !!weatherSignal &&
      (rule.priority !== 'ignore'
        ? weightedWeatherScore >= definition.activationThreshold
        : weatherSignal.score >= definition.ignoredOverrideThreshold);
    const shouldActivateFromAlert = !!alertSignal;

    if (!shouldActivateFromWeather && !shouldActivateFromAlert) {
      return null;
    }

    let score = weightedWeatherScore;
    let source: DerivedHazard['source'] = 'nws';
    const evidence = new Set<string>();
    const tags = new Set<string>(definition.tags);
    const reasons: string[] = [];

    if (weatherSignal && shouldActivateFromWeather) {
      score = weightedWeatherScore;
      weatherSignal.evidence.forEach((entry) => evidence.add(entry));
      weatherSignal.tags.forEach((tag) => tags.add(tag));
      reasons.push(weatherSignal.reason);
    }

    if (alertSignal) {
      score = shouldActivateFromWeather
        ? Math.min(100, Math.max(score, alertSignal.score) + 5)
        : alertSignal.score;
      source = shouldActivateFromWeather ? 'combined' : 'nps';
      alertSignal.evidence.forEach((entry) => evidence.add(entry));
      alertSignal.tags.forEach((tag) => tags.add(tag));
      reasons.unshift(alertSignal.reason);
    }

    if (shouldActivateFromWeather && !alertSignal) {
      source = 'nws';
    }

    const severity = this.scoreToSeverity(score);
    const reason = reasons[0] ?? 'Seasonal hazard conditions were detected.';
    const summary = this.composeSummary(
      definition.type,
      season,
      profile,
      reason,
      source,
    );

    return {
      id: `hazard-${parkSlug}-${season}-${definition.type.toLowerCase()}`,
      type: definition.type,
      title: definition.title,
      severity,
      priority: rule.priority,
      score,
      source,
      summary,
      reason,
      evidence: [...evidence],
      tags: [...tags],
      season,
      profile,
    };
  }

  private composeSummary(
    type: HazardType,
    season: Season,
    profile: ParkMetadata['hazardProfile'],
    reason: string,
    source: DerivedHazard['source'],
  ): string {
    const sourceSuffix =
      source === 'combined'
        ? 'Live weather and active alerts both support this hazard.'
        : source === 'nps'
          ? 'This is currently supported by active NPS alerts.'
          : 'This is currently supported by the forecast.';

    return `${type} during ${season} ${profile.replace(/_/g, ' ')} conditions. ${reason} ${sourceSuffix}`;
  }

  private deriveRiskLevel(hazards: DerivedHazard[]): HazardSeverity {
    if (!hazards.length) {
      return 'low';
    }

    if (hazards.some((hazard) => hazard.severity === 'high')) {
      return 'high';
    }

    const moderateOrAbove = hazards.filter(
      (hazard) => hazard.severity !== 'low',
    ).length;
    if (moderateOrAbove >= 2) {
      return 'high';
    }

    if (moderateOrAbove === 1) {
      return 'moderate';
    }

    return 'low';
  }

  private scoreToSeverity(score: number): HazardSeverity {
    if (score >= 80) {
      return 'high';
    }

    if (score >= 55) {
      return 'moderate';
    }

    return 'low';
  }

  private compareHazards(left: DerivedHazard, right: DerivedHazard): number {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    return this.severityRank(left.severity) - this.severityRank(right.severity);
  }

  private severityRank(severity: HazardSeverity): number {
    return { low: 1, moderate: 2, high: 3 }[severity];
  }

  private normalizeTemperature(
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

  private parseWindSpeedMph(value: string): number {
    const matches = [
      ...value.matchAll(/(\d+)(?:\s*(?:to|-)\s*(\d+))?\s*(mph|kt|km\/h)?/gi),
    ];

    if (!matches.length) {
      return 0;
    }

    return matches.reduce((highest, match) => {
      const first = Number(match[1] ?? 0);
      const second = Number(match[2] ?? first);
      const unit = (match[3] ?? 'mph').toLowerCase();
      const candidate = Math.max(first, second);
      const mph =
        unit === 'kt'
          ? Math.round(candidate * 1.15078)
          : unit === 'km/h'
            ? Math.round(candidate * 0.621371)
            : candidate;

      return Math.max(highest, mph);
    }, 0);
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3).trim()}...`;
  }
}
