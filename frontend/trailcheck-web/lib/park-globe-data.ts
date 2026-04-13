import { PARK_MAP_PARKS } from '@/lib/park-map-data';

// Coordinates are based on a published NPS-linked national parks dataset, with
// a few newer parks filled in manually where that older dataset had gaps.
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

export type ParkGlobePoint = (typeof PARK_MAP_PARKS)[number] & {
  lat: number;
  lng: number;
};

export const PARK_GLOBE_POINTS: ParkGlobePoint[] = PARK_MAP_PARKS.map((park) => {
  const coordinates = PARK_COORDINATES[park.slug];

  if (!coordinates) {
    throw new Error(`Missing globe coordinates for park slug "${park.slug}"`);
  }

  return {
    ...park,
    ...coordinates,
  };
});
