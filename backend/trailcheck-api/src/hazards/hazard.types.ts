export type Season = 'winter' | 'spring' | 'summer' | 'fall';

export type HazardSeverity = 'low' | 'moderate' | 'high';

export type HazardPriority = 'ignore' | 'low' | 'medium' | 'high' | 'critical';

export type HazardType =
  | 'HEAT'
  | 'DEHYDRATION'
  | 'WILDFIRE'
  | 'AIR_QUALITY'
  | 'SNOW_ICE'
  | 'FLOODING'
  | 'MUD'
  | 'HIGH_WIND'
  | 'LIGHTNING'
  | 'ROCKFALL'
  | 'TRAIL_CLOSURE'
  | 'COLD'
  | 'FREEZE_THAW'
  | 'SLIPPERY_TRAILS'
  | 'COASTAL_HAZARD';

export type HazardProfileId =
  | 'desert'
  | 'alpine'
  | 'temperate_forest'
  | 'coastal'
  | 'subarctic'
  | 'swamp_wetland'
  | 'canyon_exposure';

export interface HazardRuleSetting {
  priority: HazardPriority;
  weight: number;
  note?: string;
}

export interface SeasonalHazardProfile {
  id: HazardProfileId;
  label: string;
  description: string;
  seasons: Record<Season, Partial<Record<HazardType, HazardRuleSetting>>>;
}

export interface DerivedWeatherFeatures {
  periodCount: number;
  maxTemperatureF: number | null;
  minTemperatureF: number | null;
  maxWindMph: number;
  wetPeriods: number;
  snowPeriods: number;
  thunderPeriods: number;
  smokePeriods: number;
  hotPeriods: number;
  coldPeriods: number;
  freezeThaw: boolean;
  heavyRainSignal: boolean;
  sustainedWetPattern: boolean;
  dryWindSignal: boolean;
  combinedText: string;
}

export interface DerivedHazard {
  id: string;
  type: HazardType;
  title: string;
  severity: HazardSeverity;
  priority: HazardPriority;
  score: number;
  source: 'nps' | 'nws' | 'combined';
  summary: string;
  reason: string;
  evidence: string[];
  tags: string[];
  season: Season;
  profile: HazardProfileId;
}

export interface SeasonalHazardAssessment {
  parkSlug: string;
  parkCode: string | null;
  season: Season;
  profile: HazardProfileId;
  riskLevel: HazardSeverity;
  activeHazards: DerivedHazard[];
  ignoredHazards: HazardType[];
  weatherFeatures: DerivedWeatherFeatures;
}

export interface HazardSignal {
  score: number;
  severity: HazardSeverity;
  reason: string;
  evidence: string[];
  tags: string[];
}

export const HAZARD_PRIORITY_WEIGHTS: Record<HazardPriority, number> = {
  ignore: 0,
  low: 0.7,
  medium: 1,
  high: 1.2,
  critical: 1.45,
};

export const HAZARD_SEVERITY_RANK: Record<HazardSeverity, number> = {
  low: 1,
  moderate: 2,
  high: 3,
};
