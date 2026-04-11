import { PARK_MAP_PARKS, type ParkMapRegion } from '@/lib/park-map-data';

type RegionBounds = {
  west: number;
  east: number;
  north: number;
  south: number;
};

const REGION_BOUNDS: Record<ParkMapRegion, RegionBounds> = {
  mainland: {
    west: -124.8,
    east: -66.9,
    north: 49.5,
    south: 24.0,
  },
  alaska: {
    west: -179.9,
    east: -129.5,
    north: 71.8,
    south: 51.0,
  },
  hawaii: {
    west: -160.8,
    east: -154.5,
    north: 22.5,
    south: 18.8,
  },
  pacific: {
    west: -171.2,
    east: -168.0,
    north: -13.8,
    south: -14.6,
  },
  caribbean: {
    west: -65.3,
    east: -64.2,
    north: 18.5,
    south: 17.6,
  },
};

export type ParkGlobePoint = (typeof PARK_MAP_PARKS)[number] & {
  lat: number;
  lng: number;
};

function mapPointToCoords(region: ParkMapRegion, x: number, y: number) {
  const bounds = REGION_BOUNDS[region];
  const lng = bounds.west + (x / 100) * (bounds.east - bounds.west);
  const lat = bounds.north - (y / 100) * (bounds.north - bounds.south);

  return { lat, lng };
}

export const PARK_GLOBE_POINTS: ParkGlobePoint[] = PARK_MAP_PARKS.map((park) => ({
  ...park,
  ...mapPointToCoords(park.region, park.x, park.y),
}));
