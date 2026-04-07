import { PARK_CATALOG } from '@/lib/park-catalog';

export type ParkMapRegion =
  | 'mainland'
  | 'alaska'
  | 'hawaii'
  | 'pacific'
  | 'caribbean';

type ParkMapPoint = {
  region: ParkMapRegion;
  x: number;
  y: number;
};

const PARK_MAP_POINTS: Record<string, ParkMapPoint> = {
  acadia: { region: 'mainland', x: 95.6, y: 20.8 },
  'american-samoa': { region: 'pacific', x: 58, y: 55 },
  arches: { region: 'mainland', x: 28, y: 58.5 },
  badlands: { region: 'mainland', x: 49, y: 36.8 },
  'big-bend': { region: 'mainland', x: 29, y: 88.6 },
  biscayne: { region: 'mainland', x: 86, y: 86.6 },
  'black-canyon-of-the-gunnison': { region: 'mainland', x: 30.6, y: 63.2 },
  'bryce-canyon': { region: 'mainland', x: 24.2, y: 54.4 },
  canyonlands: { region: 'mainland', x: 27, y: 60.3 },
  'capitol-reef': { region: 'mainland', x: 25.7, y: 57.7 },
  'carlsbad-caverns': { region: 'mainland', x: 34.7, y: 78.3 },
  'channel-islands': { region: 'mainland', x: 5.2, y: 75.3 },
  congaree: { region: 'mainland', x: 79.4, y: 73 },
  'crater-lake': { region: 'mainland', x: 7, y: 45.1 },
  'cuyahoga-valley': { region: 'mainland', x: 72.5, y: 47.2 },
  'death-valley': { region: 'mainland', x: 13.8, y: 62.4 },
  denali: { region: 'alaska', x: 43, y: 31 },
  'dry-tortugas': { region: 'mainland', x: 82.9, y: 95 },
  everglades: { region: 'mainland', x: 83.8, y: 88.1 },
  'gates-of-the-arctic': { region: 'alaska', x: 48, y: 12 },
  'gateway-arch': { region: 'mainland', x: 61.8, y: 60 },
  glacier: { region: 'mainland', x: 31.6, y: 28.8 },
  'glacier-bay': { region: 'alaska', x: 23, y: 36 },
  'grand-canyon': { region: 'mainland', x: 19.7, y: 65.4 },
  'grand-teton': { region: 'mainland', x: 34.2, y: 37.4 },
  'great-basin': { region: 'mainland', x: 17.5, y: 53.4 },
  'great-sand-dunes': { region: 'mainland', x: 35.2, y: 66.8 },
  'great-smoky-mountains': { region: 'mainland', x: 76, y: 63.8 },
  'guadalupe-mountains': { region: 'mainland', x: 37.1, y: 80 },
  haleakala: { region: 'hawaii', x: 78, y: 58 },
  'hawaii-volcanoes': { region: 'hawaii', x: 84, y: 72 },
  'hot-springs': { region: 'mainland', x: 61.1, y: 72.3 },
  'indiana-dunes': { region: 'mainland', x: 69.2, y: 48.2 },
  'isle-royale': { region: 'mainland', x: 69.2, y: 27.8 },
  'joshua-tree': { region: 'mainland', x: 13.4, y: 70.5 },
  katmai: { region: 'alaska', x: 51, y: 44 },
  'kenai-fjords': { region: 'alaska', x: 37, y: 51 },
  'kings-canyon': { region: 'mainland', x: 9.2, y: 63.7 },
  'kobuk-valley': { region: 'alaska', x: 41, y: 18 },
  'lake-clark': { region: 'alaska', x: 42, y: 47 },
  'lassen-volcanic': { region: 'mainland', x: 8.2, y: 49.8 },
  'mammoth-cave': { region: 'mainland', x: 71.3, y: 60.5 },
  'mesa-verde': { region: 'mainland', x: 30.3, y: 68.3 },
  'mount-rainier': { region: 'mainland', x: 8.2, y: 15.4 },
  'new-river-gorge': { region: 'mainland', x: 79.1, y: 56.1 },
  'north-cascades': { region: 'mainland', x: 8.1, y: 10.8 },
  olympic: { region: 'mainland', x: 2.9, y: 14.2 },
  'petrified-forest': { region: 'mainland', x: 24.6, y: 71.3 },
  pinnacles: { region: 'mainland', x: 8.3, y: 61.1 },
  redwood: { region: 'mainland', x: 4.6, y: 39.2 },
  'rocky-mountain': { region: 'mainland', x: 38.3, y: 53.4 },
  saguaro: { region: 'mainland', x: 19.2, y: 78.4 },
  sequoia: { region: 'mainland', x: 9.5, y: 66.7 },
  shenandoah: { region: 'mainland', x: 82.6, y: 53.7 },
  'theodore-roosevelt': { region: 'mainland', x: 46.8, y: 31.4 },
  'virgin-islands': { region: 'caribbean', x: 72, y: 61 },
  voyageurs: { region: 'mainland', x: 58.8, y: 24.7 },
  'white-sands': { region: 'mainland', x: 33.7, y: 80.4 },
  'wind-cave': { region: 'mainland', x: 48.8, y: 42.1 },
  'wrangell-st-elias': { region: 'alaska', x: 61, y: 49 },
  yellowstone: { region: 'mainland', x: 35.3, y: 33.6 },
  yosemite: { region: 'mainland', x: 11, y: 58.8 },
  zion: { region: 'mainland', x: 23.7, y: 57.3 },
};

export const PARK_MAP_PARKS = PARK_CATALOG.map((park) => {
  const point = PARK_MAP_POINTS[park.slug];

  if (!point) {
    throw new Error(`Missing map coordinates for park slug "${park.slug}"`);
  }

  return {
    ...park,
    ...point,
  };
});

if (PARK_MAP_PARKS.length !== 63) {
  throw new Error(`Expected 63 parks on the map, received ${PARK_MAP_PARKS.length}`);
}
