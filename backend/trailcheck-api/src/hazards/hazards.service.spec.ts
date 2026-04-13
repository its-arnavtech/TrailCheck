import { Test, TestingModule } from '@nestjs/testing';
import { HazardsService } from './hazards.service';
import type { NpsAlert } from '../nps/nps.service';
import type { ParkWeather } from '../weather/weather.service';

function buildWeather(periods: Array<{
  name: string;
  temperature: number;
  windSpeed: string;
  shortForecast: string;
  detailedForecast: string;
  temperatureUnit?: string;
}>): ParkWeather {
  return {
    parkSlug: 'test-park',
    forecast: periods.map((period) => ({
      temperatureUnit: 'F',
      icon: '',
      ...period,
    })),
  };
}

describe('HazardsService', () => {
  let service: HazardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HazardsService],
    }).compile();

    service = module.get<HazardsService>(HazardsService);
  });

  it('uses summer canyon logic for Zion instead of checking winter hazards equally', () => {
    const weather = buildWeather([
      {
        name: 'Today',
        temperature: 104,
        windSpeed: '15 to 25 mph',
        shortForecast: 'Sunny and hot',
        detailedForecast: 'Sunny, hot, dry, and breezy throughout the canyon.',
      },
      {
        name: 'Tonight',
        temperature: 79,
        windSpeed: '10 mph',
        shortForecast: 'Clear',
        detailedForecast: 'Clear and dry overnight.',
      },
    ]);

    const assessment = service.assessParkHazards(
      'zion',
      [],
      weather,
      new Date('2026-07-12T18:00:00Z'),
    );

    expect(assessment.season).toBe('summer');
    expect(assessment.profile).toBe('canyon_exposure');
    expect(assessment.activeHazards.map((hazard) => hazard.type)).toEqual(
      expect.arrayContaining(['HEAT', 'DEHYDRATION']),
    );
    expect(assessment.ignoredHazards).toContain('SNOW_ICE');
    expect(assessment.riskLevel).toBe('high');
  });

  it('prioritizes snow and cold in alpine winter parks', () => {
    const weather = buildWeather([
      {
        name: 'Tonight',
        temperature: 12,
        windSpeed: '25 to 35 mph',
        shortForecast: 'Snow showers likely',
        detailedForecast: 'Snow showers with blowing snow and icy conditions.',
      },
      {
        name: 'Tomorrow',
        temperature: 24,
        windSpeed: '30 mph',
        shortForecast: 'Chance of snow',
        detailedForecast: 'Cold with gusty winds and lingering snowpack.',
      },
    ]);

    const assessment = service.assessParkHazards(
      'yosemite',
      [],
      weather,
      new Date('2026-01-15T18:00:00Z'),
    );

    expect(assessment.season).toBe('winter');
    expect(assessment.profile).toBe('alpine');
    expect(assessment.activeHazards.map((hazard) => hazard.type)).toEqual(
      expect.arrayContaining(['SNOW_ICE', 'COLD', 'HIGH_WIND']),
    );
    expect(assessment.activeHazards[0]?.severity).toBe('high');
  });

  it('prioritizes flooding and mud for spring temperate forest conditions', () => {
    const weather = buildWeather([
      {
        name: 'Today',
        temperature: 58,
        windSpeed: '10 mph',
        shortForecast: 'Rain showers',
        detailedForecast: 'Periods of rain with saturated trails and creeks running high.',
      },
      {
        name: 'Tonight',
        temperature: 46,
        windSpeed: '8 mph',
        shortForecast: 'Showers likely',
        detailedForecast: 'Additional rain overnight keeps trails wet and muddy.',
      },
      {
        name: 'Tomorrow',
        temperature: 60,
        windSpeed: '12 mph',
        shortForecast: 'Chance of rain',
        detailedForecast: 'More showers during the day.',
      },
    ]);

    const assessment = service.assessParkHazards(
      'shenandoah',
      [],
      weather,
      new Date('2026-04-10T16:00:00Z'),
    );

    expect(assessment.season).toBe('spring');
    expect(assessment.profile).toBe('temperate_forest');
    expect(assessment.activeHazards.map((hazard) => hazard.type)).toEqual(
      expect.arrayContaining(['FLOODING', 'MUD', 'SLIPPERY_TRAILS']),
    );
  });

  it('elevates alert-driven closures even when weather is otherwise mild', () => {
    const alerts: NpsAlert[] = [
      {
        id: 'closure-1',
        title: 'Angels Landing Trail Closed',
        description: 'Trail closed due to rockfall cleanup until further notice.',
        category: 'Park Closure',
        parkCode: 'zion',
        url: 'https://example.test/closure',
      },
    ];

    const weather = buildWeather([
      {
        name: 'Today',
        temperature: 74,
        windSpeed: '5 mph',
        shortForecast: 'Sunny',
        detailedForecast: 'Clear and mild conditions.',
      },
    ]);

    const assessment = service.assessParkHazards(
      'zion',
      alerts,
      weather,
      new Date('2026-11-03T18:00:00Z'),
    );

    const closureHazard = assessment.activeHazards.find((hazard) => hazard.type === 'TRAIL_CLOSURE');
    const rockfallHazard = assessment.activeHazards.find((hazard) => hazard.type === 'ROCKFALL');

    expect(closureHazard).toBeDefined();
    expect(closureHazard?.source).toBe('nps');
    expect(closureHazard?.severity).toBe('high');
    expect(rockfallHazard?.source).toBe('nps');
    expect(assessment.riskLevel).toBe('high');
  });

  it('resolves southern hemisphere seasonality for American Samoa', () => {
    const weather = buildWeather([
      {
        name: 'Today',
        temperature: 88,
        windSpeed: '18 mph',
        shortForecast: 'Humid with thunderstorms and rough surf likely',
        detailedForecast:
          'Thunderstorms with heavy rain over island trails and hazardous surf along exposed coastal access points.',
      },
    ]);

    const assessment = service.assessParkHazards(
      'american-samoa',
      [],
      weather,
      new Date('2026-01-12T08:00:00Z'),
    );

    expect(assessment.season).toBe('summer');
    expect(assessment.profile).toBe('coastal');
    expect(assessment.activeHazards.map((hazard) => hazard.type)).toEqual(
      expect.arrayContaining(['LIGHTNING', 'COASTAL_HAZARD']),
    );
  });
});
