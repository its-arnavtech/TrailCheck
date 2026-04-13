import type { ParkMetadata } from '../parks/park-registry';
import type {
  DerivedWeatherFeatures,
  HazardSignal,
  HazardType,
  Season,
} from './hazard.types';

export interface HazardDefinitionContext {
  park: ParkMetadata;
  season: Season;
  weatherFeatures: DerivedWeatherFeatures;
}

export interface HazardDefinition {
  type: HazardType;
  title: string;
  tags: string[];
  alertKeywords: string[];
  activationThreshold: number;
  ignoredOverrideThreshold: number;
  evaluateWeather: (context: HazardDefinitionContext) => HazardSignal | null;
}

function severityFromScore(score: number): HazardSignal['severity'] {
  if (score >= 80) {
    return 'high';
  }

  if (score >= 55) {
    return 'moderate';
  }

  return 'low';
}

function signal(
  score: number,
  reason: string,
  evidence: string[],
  tags: string[],
): HazardSignal {
  return {
    score,
    severity: severityFromScore(score),
    reason,
    evidence,
    tags,
  };
}

function hasProfile(park: ParkMetadata, profiles: ParkMetadata['hazardProfile'][]) {
  return profiles.includes(park.hazardProfile);
}

export const HAZARD_DEFINITIONS: Record<HazardType, HazardDefinition> = {
  HEAT: {
    type: 'HEAT',
    title: 'Heat exposure',
    tags: ['heat', 'sun', 'exposure'],
    alertKeywords: ['heat', 'extreme heat', 'dangerous heat', 'exposure'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 82,
    evaluateWeather: ({ weatherFeatures }) => {
      const temp = weatherFeatures.maxTemperatureF;
      if (temp === null) {
        return null;
      }

      if (temp >= 100) {
        return signal(
          90,
          `Forecast highs near ${Math.round(temp)}F create serious heat exposure risk.`,
          [`Max forecast temperature ${Math.round(temp)}F.`],
          ['heat', 'temperature'],
        );
      }

      if (temp >= 90) {
        return signal(
          70,
          `Forecast highs near ${Math.round(temp)}F can stress hikers during exposed travel.`,
          [`Max forecast temperature ${Math.round(temp)}F.`],
          ['heat', 'temperature'],
        );
      }

      return null;
    },
  },
  DEHYDRATION: {
    type: 'DEHYDRATION',
    title: 'Dehydration risk',
    tags: ['heat', 'water', 'exposure'],
    alertKeywords: ['dehydration', 'water shortage', 'carry water', 'water access'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 80,
    evaluateWeather: ({ park, weatherFeatures }) => {
      const temp = weatherFeatures.maxTemperatureF;
      if (temp === null) {
        return null;
      }

      const exposedProfile = hasProfile(park, ['desert', 'canyon_exposure']);
      if (temp >= 95 && (weatherFeatures.dryWindSignal || exposedProfile)) {
        return signal(
          84,
          'Hot temperatures plus dry or exposed terrain sharply increase water loss.',
          [
            `Max forecast temperature ${Math.round(temp)}F.`,
            weatherFeatures.dryWindSignal ? 'Forecast includes hot and windy periods.' : 'Park profile favors exposed travel.',
          ],
          ['heat', 'dehydration', 'exposure'],
        );
      }

      if (temp >= 85 && exposedProfile) {
        return signal(
          58,
          'Warm conditions in exposed terrain still raise dehydration risk.',
          [`Max forecast temperature ${Math.round(temp)}F.`],
          ['dehydration', 'exposure'],
        );
      }

      return null;
    },
  },
  WILDFIRE: {
    type: 'WILDFIRE',
    title: 'Wildfire risk',
    tags: ['fire', 'dry', 'wind'],
    alertKeywords: ['fire', 'wildfire', 'red flag', 'burning', 'evacuat', 'burn ban'],
    activationThreshold: 55,
    ignoredOverrideThreshold: 75,
    evaluateWeather: ({ weatherFeatures }) => {
      if (weatherFeatures.smokePeriods > 0) {
        return signal(
          72,
          'Forecast mentions smoke, which can indicate active fire impacts nearby.',
          ['Forecast mentions smoke or haze.'],
          ['fire', 'smoke', 'air-quality'],
        );
      }

      if (weatherFeatures.dryWindSignal) {
        return signal(
          64,
          'Hot, dry, and windy conditions can support fire spread or fire-weather concerns.',
          ['Forecast shows hot temperatures with stronger winds.'],
          ['fire', 'wind', 'dry'],
        );
      }

      return null;
    },
  },
  AIR_QUALITY: {
    type: 'AIR_QUALITY',
    title: 'Smoke or air quality concerns',
    tags: ['smoke', 'air-quality'],
    alertKeywords: ['smoke', 'air quality', 'air-quality', 'haze'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 70,
    evaluateWeather: ({ weatherFeatures }) => {
      if (weatherFeatures.smokePeriods === 0) {
        return null;
      }

      return signal(
        78,
        'Forecast mentions smoke or haze that may reduce visibility or breathing comfort.',
        ['Forecast mentions smoke or haze.'],
        ['smoke', 'air-quality'],
      );
    },
  },
  SNOW_ICE: {
    type: 'SNOW_ICE',
    title: 'Snow and ice hazards',
    tags: ['snow', 'ice', 'winter'],
    alertKeywords: ['snow', 'ice', 'icy', 'blizzard', 'winter storm', 'freezing rain', 'sleet'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 75,
    evaluateWeather: ({ weatherFeatures }) => {
      if (weatherFeatures.snowPeriods > 0) {
        return signal(
          86,
          'Forecast snow or wintry mix can create traction and route-finding problems.',
          ['Forecast mentions snow, sleet, or wintry precipitation.'],
          ['snow', 'ice', 'winter'],
        );
      }

      if (
        weatherFeatures.freezeThaw ||
        (weatherFeatures.minTemperatureF !== null &&
          weatherFeatures.minTemperatureF <= 32 &&
          weatherFeatures.wetPeriods > 0)
      ) {
        return signal(
          70,
          'Freezing temperatures with moisture support icy trail or road surfaces.',
          [
            weatherFeatures.freezeThaw ? 'Forecast crosses freezing, supporting melt/refreeze cycles.' : 'Wet forecast with freezing temperatures.',
          ],
          ['ice', 'freeze', 'traction'],
        );
      }

      return null;
    },
  },
  FLOODING: {
    type: 'FLOODING',
    title: 'Flooding or washout risk',
    tags: ['flood', 'washout', 'water'],
    alertKeywords: ['flood', 'flash flood', 'high water', 'washout', 'washed out'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 78,
    evaluateWeather: ({ park, season, weatherFeatures }) => {
      if (weatherFeatures.heavyRainSignal) {
        return signal(
          88,
          'Heavy rain wording suggests runoff, washouts, or creek-crossing issues.',
          ['Forecast includes heavy rain or intense rainfall wording.'],
          ['flood', 'rain', 'washout'],
        );
      }

      if (
        weatherFeatures.sustainedWetPattern &&
        (season === 'spring' || hasProfile(park, ['swamp_wetland', 'canyon_exposure', 'coastal']))
      ) {
        return signal(
          70,
          'A sustained wet pattern can elevate runoff and low-lying trail flooding risk.',
          ['Multiple forecast periods mention rain or showers.'],
          ['flood', 'rain', 'runoff'],
        );
      }

      return null;
    },
  },
  MUD: {
    type: 'MUD',
    title: 'Muddy trail conditions',
    tags: ['mud', 'trail-surface'],
    alertKeywords: ['mud', 'muddy', 'trail damage', 'washout'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 70,
    evaluateWeather: ({ park, season, weatherFeatures }) => {
      if (
        weatherFeatures.sustainedWetPattern &&
        (season === 'spring' || hasProfile(park, ['temperate_forest', 'swamp_wetland', 'alpine']))
      ) {
        return signal(
          66,
          'Repeated rain often leaves forested or thawing trails muddy and slower to travel.',
          ['Multiple wet forecast periods detected.'],
          ['mud', 'rain', 'trail-surface'],
        );
      }

      return null;
    },
  },
  HIGH_WIND: {
    type: 'HIGH_WIND',
    title: 'High wind hazard',
    tags: ['wind', 'gusts'],
    alertKeywords: ['wind', 'gust', 'high wind', 'blowing dust'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 75,
    evaluateWeather: ({ park, weatherFeatures }) => {
      if (weatherFeatures.maxWindMph >= 45) {
        return signal(
          84,
          'Strong forecast winds can affect exposed ridges, overlooks, and falling branches.',
          [`Peak forecast wind ${weatherFeatures.maxWindMph} mph.`],
          ['wind', 'gusts'],
        );
      }

      if (
        weatherFeatures.maxWindMph >= 28 ||
        (weatherFeatures.maxWindMph >= 20 && hasProfile(park, ['desert', 'coastal', 'canyon_exposure']))
      ) {
        return signal(
          62,
          'Windy conditions can materially affect exposed trail segments or access roads.',
          [`Peak forecast wind ${weatherFeatures.maxWindMph} mph.`],
          ['wind', 'gusts'],
        );
      }

      return null;
    },
  },
  LIGHTNING: {
    type: 'LIGHTNING',
    title: 'Thunderstorm and lightning risk',
    tags: ['lightning', 'thunderstorm'],
    alertKeywords: ['lightning', 'thunderstorm', 'storm'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 72,
    evaluateWeather: ({ weatherFeatures }) => {
      if (weatherFeatures.thunderPeriods === 0) {
        return null;
      }

      return signal(
        80,
        'Thunderstorms in the forecast raise lightning exposure risk on open or elevated terrain.',
        ['Forecast mentions thunderstorms or lightning.'],
        ['lightning', 'storm'],
      );
    },
  },
  ROCKFALL: {
    type: 'ROCKFALL',
    title: 'Rockfall or debris hazard',
    tags: ['rockfall', 'debris', 'landslide'],
    alertKeywords: ['rockfall', 'falling rock', 'landslide', 'slide', 'debris'],
    activationThreshold: 52,
    ignoredOverrideThreshold: 75,
    evaluateWeather: ({ park, weatherFeatures }) => {
      if (!hasProfile(park, ['alpine', 'canyon_exposure'])) {
        return null;
      }

      if (weatherFeatures.freezeThaw) {
        return signal(
          72,
          'Freeze-thaw cycles can loosen rock and make exposed canyon or mountain routes less stable.',
          ['Forecast crosses freezing temperatures.'],
          ['rockfall', 'freeze-thaw'],
        );
      }

      if (weatherFeatures.heavyRainSignal) {
        return signal(
          68,
          'Intense rainfall can destabilize steep slopes and increase debris movement.',
          ['Forecast includes heavy rain wording.'],
          ['rockfall', 'rain', 'debris'],
        );
      }

      return null;
    },
  },
  TRAIL_CLOSURE: {
    type: 'TRAIL_CLOSURE',
    title: 'Trail or road closure risk',
    tags: ['closure', 'access'],
    alertKeywords: [
      'closed',
      'closure',
      'road closed',
      'trail closed',
      'area closed',
      'access closed',
      'chains required',
      'not accessible',
    ],
    activationThreshold: 45,
    ignoredOverrideThreshold: 45,
    evaluateWeather: () => null,
  },
  COLD: {
    type: 'COLD',
    title: 'Cold exposure',
    tags: ['cold', 'freeze'],
    alertKeywords: ['cold', 'frostbite', 'subzero', 'extreme cold'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 78,
    evaluateWeather: ({ weatherFeatures }) => {
      const minTemp = weatherFeatures.minTemperatureF;
      if (minTemp === null) {
        return null;
      }

      if (minTemp <= 15) {
        return signal(
          88,
          `Forecast lows near ${Math.round(minTemp)}F create meaningful cold-stress risk.`,
          [`Minimum forecast temperature ${Math.round(minTemp)}F.`],
          ['cold', 'freeze'],
        );
      }

      if (minTemp <= 28 || (minTemp <= 34 && weatherFeatures.maxWindMph >= 25)) {
        return signal(
          68,
          'Cold temperatures combined with exposure can slow travel and reduce safety margins.',
          [
            `Minimum forecast temperature ${Math.round(minTemp)}F.`,
            `Peak forecast wind ${weatherFeatures.maxWindMph} mph.`,
          ],
          ['cold', 'wind'],
        );
      }

      return null;
    },
  },
  FREEZE_THAW: {
    type: 'FREEZE_THAW',
    title: 'Freeze-thaw instability',
    tags: ['freeze-thaw', 'ice', 'rockfall'],
    alertKeywords: ['refreeze', 'freeze thaw', 'icy in morning'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 72,
    evaluateWeather: ({ weatherFeatures }) => {
      if (!weatherFeatures.freezeThaw) {
        return null;
      }

      return signal(
        74,
        'Temperatures crossing freezing can create melt-refreeze slick spots and unstable surfaces.',
        ['Forecast swings above and below freezing.'],
        ['freeze-thaw', 'ice'],
      );
    },
  },
  SLIPPERY_TRAILS: {
    type: 'SLIPPERY_TRAILS',
    title: 'Slippery trail surfaces',
    tags: ['slippery', 'traction'],
    alertKeywords: ['slippery', 'slick', 'poor footing'],
    activationThreshold: 50,
    ignoredOverrideThreshold: 70,
    evaluateWeather: ({ season, weatherFeatures }) => {
      if (weatherFeatures.wetPeriods === 0) {
        return null;
      }

      if (weatherFeatures.freezeThaw || season === 'fall' || season === 'spring') {
        return signal(
          64,
          'Wet surfaces, leaves, or refreezing conditions can reduce traction on trails and steps.',
          [
            weatherFeatures.freezeThaw
              ? 'Forecast crosses freezing after wet conditions.'
              : 'Forecast includes wet periods during a shoulder season.',
          ],
          ['slippery', 'traction'],
        );
      }

      return null;
    },
  },
  COASTAL_HAZARD: {
    type: 'COASTAL_HAZARD',
    title: 'Coastal or marine access hazard',
    tags: ['coastal', 'marine', 'surf'],
    alertKeywords: [
      'surf',
      'rip current',
      'marine',
      'coastal flood',
      'storm surge',
      'tropical storm',
      'hurricane',
      'boat access',
    ],
    activationThreshold: 52,
    ignoredOverrideThreshold: 75,
    evaluateWeather: ({ park, weatherFeatures }) => {
      if (!hasProfile(park, ['coastal', 'swamp_wetland'])) {
        return null;
      }

      if (/(surf|marine|rip current|coastal flood|tropical|hurricane)/i.test(weatherFeatures.combinedText)) {
        return signal(
          86,
          'Marine or coastal wording in the forecast suggests access or surf-related safety impacts.',
          ['Forecast includes marine, surf, rip current, or tropical wording.'],
          ['coastal', 'marine', 'surf'],
        );
      }

      if (weatherFeatures.maxWindMph >= 30) {
        return signal(
          64,
          'Stronger winds can complicate exposed coastal access and open-water travel.',
          [`Peak forecast wind ${weatherFeatures.maxWindMph} mph.`],
          ['coastal', 'wind'],
        );
      }

      return null;
    },
  },
};
