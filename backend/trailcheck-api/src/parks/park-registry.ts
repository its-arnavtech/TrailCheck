import { createHazardRule } from '../hazards/hazard-profiles';
import type {
  HazardProfileId,
  HazardRuleSetting,
  HazardType,
  Season,
} from '../hazards/hazard.types';

export type Hemisphere = 'north' | 'south';

export interface ParkMetadata {
  slug: string;
  parkCode: string;
  lat: number;
  lng: number;
  hazardProfile: HazardProfileId;
  hemisphere: Hemisphere;
  seasonalOverrides?: Partial<
    Record<Season, Partial<Record<HazardType, HazardRuleSetting>>>
  >;
}

const PARK_CODES: Record<string, string> = {
  acadia: 'acad',
  arches: 'arch',
  badlands: 'badl',
  'big-bend': 'bibe',
  biscayne: 'bisc',
  'black-canyon-of-the-gunnison': 'blca',
  'bryce-canyon': 'brca',
  canyonlands: 'cany',
  'capitol-reef': 'care',
  'carlsbad-caverns': 'cave',
  'channel-islands': 'chis',
  congaree: 'cong',
  'crater-lake': 'crla',
  'cuyahoga-valley': 'cuva',
  'death-valley': 'deva',
  denali: 'dena',
  'dry-tortugas': 'drto',
  everglades: 'ever',
  'gates-of-the-arctic': 'gaar',
  'gateway-arch': 'jeff',
  glacier: 'glac',
  'glacier-bay': 'glba',
  'grand-canyon': 'grca',
  'grand-teton': 'grte',
  'great-basin': 'grba',
  'great-sand-dunes': 'grsa',
  'great-smoky-mountains': 'grsm',
  'guadalupe-mountains': 'gumo',
  haleakala: 'hale',
  'hawaii-volcanoes': 'havo',
  'hot-springs': 'hosp',
  'indiana-dunes': 'indu',
  'isle-royale': 'isro',
  'joshua-tree': 'jotr',
  katmai: 'katm',
  'kenai-fjords': 'kefj',
  'kings-canyon': 'kica',
  'kobuk-valley': 'kova',
  'lake-clark': 'lacl',
  'lassen-volcanic': 'lavo',
  'mammoth-cave': 'maca',
  'mesa-verde': 'meve',
  'mount-rainier': 'mora',
  'american-samoa': 'npsa',
  'new-river-gorge': 'neri',
  'north-cascades': 'noca',
  olympic: 'olym',
  'petrified-forest': 'pefo',
  pinnacles: 'pinn',
  redwood: 'redw',
  'rocky-mountain': 'romo',
  saguaro: 'sagu',
  sequoia: 'seki',
  shenandoah: 'shen',
  'theodore-roosevelt': 'thro',
  'virgin-islands': 'viis',
  voyageurs: 'voya',
  'white-sands': 'whsa',
  'wind-cave': 'wica',
  'wrangell-st-elias': 'wrst',
  yellowstone: 'yell',
  yosemite: 'yose',
  zion: 'zion',
};

const PARK_COORDINATES: Record<string, { lat: number; lng: number }> = {
  acadia: { lat: 44.35, lng: -68.21 },
  arches: { lat: 38.68, lng: -109.57 },
  badlands: { lat: 43.75, lng: -102.5 },
  'big-bend': { lat: 29.25, lng: -103.25 },
  biscayne: { lat: 25.65, lng: -80.08 },
  'black-canyon-of-the-gunnison': { lat: 38.57, lng: -107.72 },
  'bryce-canyon': { lat: 37.57, lng: -112.18 },
  canyonlands: { lat: 38.2, lng: -109.93 },
  'capitol-reef': { lat: 38.2, lng: -111.17 },
  'carlsbad-caverns': { lat: 32.17, lng: -104.44 },
  'channel-islands': { lat: 34.01, lng: -119.42 },
  congaree: { lat: 33.78, lng: -80.78 },
  'crater-lake': { lat: 42.94, lng: -122.1 },
  'cuyahoga-valley': { lat: 41.24, lng: -81.55 },
  'death-valley': { lat: 36.24, lng: -116.82 },
  denali: { lat: 63.33, lng: -150.5 },
  'dry-tortugas': { lat: 24.63, lng: -82.87 },
  everglades: { lat: 25.32, lng: -80.93 },
  'gates-of-the-arctic': { lat: 67.78, lng: -153.3 },
  'gateway-arch': { lat: 38.6247, lng: -90.1848 },
  glacier: { lat: 48.8, lng: -114 },
  'glacier-bay': { lat: 58.5, lng: -137 },
  'grand-canyon': { lat: 36.06, lng: -112.14 },
  'grand-teton': { lat: 43.73, lng: -110.8 },
  'great-basin': { lat: 38.98, lng: -114.3 },
  'great-sand-dunes': { lat: 37.73, lng: -105.51 },
  'great-smoky-mountains': { lat: 35.68, lng: -83.53 },
  'guadalupe-mountains': { lat: 31.92, lng: -104.87 },
  haleakala: { lat: 20.72, lng: -156.17 },
  'hawaii-volcanoes': { lat: 19.38, lng: -155.2 },
  'hot-springs': { lat: 34.51, lng: -93.05 },
  'indiana-dunes': { lat: 41.633349, lng: -87.053762 },
  'isle-royale': { lat: 48.1, lng: -88.55 },
  'joshua-tree': { lat: 33.79, lng: -115.9 },
  katmai: { lat: 58.5, lng: -155 },
  'kenai-fjords': { lat: 59.92, lng: -149.65 },
  'kings-canyon': { lat: 36.8, lng: -118.55 },
  'kobuk-valley': { lat: 67.55, lng: -159.28 },
  'lake-clark': { lat: 60.97, lng: -153.42 },
  'lassen-volcanic': { lat: 40.49, lng: -121.51 },
  'mammoth-cave': { lat: 37.18, lng: -86.1 },
  'mesa-verde': { lat: 37.18, lng: -108.49 },
  'mount-rainier': { lat: 46.85, lng: -121.75 },
  'american-samoa': { lat: -14.25, lng: -170.68 },
  'new-river-gorge': { lat: 38.07003, lng: -81.07583 },
  'north-cascades': { lat: 48.7, lng: -121.2 },
  olympic: { lat: 47.97, lng: -123.5 },
  'petrified-forest': { lat: 35.07, lng: -109.78 },
  pinnacles: { lat: 36.48, lng: -121.16 },
  redwood: { lat: 41.3, lng: -124 },
  'rocky-mountain': { lat: 40.4, lng: -105.58 },
  saguaro: { lat: 32.25, lng: -110.5 },
  sequoia: { lat: 36.43, lng: -118.68 },
  shenandoah: { lat: 38.53, lng: -78.35 },
  'theodore-roosevelt': { lat: 46.97, lng: -103.45 },
  'virgin-islands': { lat: 18.33, lng: -64.73 },
  voyageurs: { lat: 48.5, lng: -92.88 },
  'white-sands': { lat: 32.779167, lng: -106.171944 },
  'wind-cave': { lat: 43.57, lng: -103.48 },
  'wrangell-st-elias': { lat: 61, lng: -142 },
  yellowstone: { lat: 44.6, lng: -110.5 },
  yosemite: { lat: 37.83, lng: -119.5 },
  zion: { lat: 37.3, lng: -113.05 },
};

const PROFILE_GROUPS: Record<HazardProfileId, string[]> = {
  desert: [
    'big-bend',
    'carlsbad-caverns',
    'death-valley',
    'great-basin',
    'guadalupe-mountains',
    'joshua-tree',
    'petrified-forest',
    'saguaro',
    'white-sands',
  ],
  canyon_exposure: [
    'arches',
    'badlands',
    'black-canyon-of-the-gunnison',
    'bryce-canyon',
    'canyonlands',
    'capitol-reef',
    'grand-canyon',
    'mesa-verde',
    'pinnacles',
    'theodore-roosevelt',
    'zion',
  ],
  alpine: [
    'crater-lake',
    'glacier',
    'grand-teton',
    'great-sand-dunes',
    'kings-canyon',
    'lassen-volcanic',
    'mount-rainier',
    'north-cascades',
    'rocky-mountain',
    'sequoia',
    'wind-cave',
    'yellowstone',
    'yosemite',
  ],
  temperate_forest: [
    'cuyahoga-valley',
    'gateway-arch',
    'great-smoky-mountains',
    'hot-springs',
    'mammoth-cave',
    'new-river-gorge',
    'shenandoah',
  ],
  coastal: [
    'acadia',
    'channel-islands',
    'haleakala',
    'hawaii-volcanoes',
    'indiana-dunes',
    'olympic',
    'redwood',
    'virgin-islands',
    'american-samoa',
  ],
  subarctic: [
    'denali',
    'gates-of-the-arctic',
    'glacier-bay',
    'isle-royale',
    'katmai',
    'kenai-fjords',
    'kobuk-valley',
    'lake-clark',
    'voyageurs',
    'wrangell-st-elias',
  ],
  swamp_wetland: ['biscayne', 'congaree', 'dry-tortugas', 'everglades'],
};

const SOUTHERN_HEMISPHERE_PARKS = new Set(['american-samoa']);

const PARK_SEASONAL_OVERRIDES: Partial<
  Record<
    string,
    Partial<Record<Season, Partial<Record<HazardType, HazardRuleSetting>>>>
  >
> = {
  yosemite: {
    summer: {
      WILDFIRE: createHazardRule(
        'high',
        1.35,
        'Dry Sierra summers elevate fire sensitivity.',
      ),
      ROCKFALL: createHazardRule(
        'high',
        1.2,
        'Granite exposure and thaw cycles raise rockfall relevance.',
      ),
    },
  },
  yellowstone: {
    winter: {
      TRAIL_CLOSURE: createHazardRule(
        'high',
        1.3,
        'Snowpack and road closures matter strongly in Yellowstone winters.',
      ),
    },
    summer: {
      WILDFIRE: createHazardRule(
        'high',
        1.25,
        'Late-summer fire and smoke can materially affect access.',
      ),
    },
  },
  'dry-tortugas': {
    summer: {
      COASTAL_HAZARD: createHazardRule(
        'high',
        1.3,
        'Boat access makes marine and tropical weather especially relevant.',
      ),
    },
  },
};

function buildParkProfileMap() {
  return Object.entries(PROFILE_GROUPS).reduce<Record<string, HazardProfileId>>(
    (accumulator, [profile, slugs]) => {
      slugs.forEach((slug) => {
        accumulator[slug] = profile as HazardProfileId;
      });
      return accumulator;
    },
    {},
  );
}

const PARK_PROFILE_MAP = buildParkProfileMap();

export const PARK_METADATA_BY_SLUG: Record<string, ParkMetadata> = Object.keys(
  PARK_CODES,
).reduce<Record<string, ParkMetadata>>((accumulator, slug) => {
  const coordinates = PARK_COORDINATES[slug];
  const hazardProfile = PARK_PROFILE_MAP[slug];

  if (!coordinates) {
    throw new Error(`Missing park coordinates for slug "${slug}"`);
  }

  if (!hazardProfile) {
    throw new Error(`Missing hazard profile mapping for slug "${slug}"`);
  }

  accumulator[slug] = {
    slug,
    parkCode: PARK_CODES[slug],
    lat: coordinates.lat,
    lng: coordinates.lng,
    hazardProfile,
    hemisphere: SOUTHERN_HEMISPHERE_PARKS.has(slug) ? 'south' : 'north',
    seasonalOverrides: PARK_SEASONAL_OVERRIDES[slug],
  };

  return accumulator;
}, {});

export function getParkMetadata(slug: string): ParkMetadata | undefined {
  return PARK_METADATA_BY_SLUG[slug];
}
