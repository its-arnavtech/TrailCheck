import { parkTrails } from '../../prisma/data/park-trails';
import { parks } from '../../prisma/data/parks';

export type StaticTrailRecord = {
  id: number;
  parkId: number;
  name: string;
  slug: string;
  difficulty: 'EASY' | 'MODERATE' | 'HARD';
  status: 'OPEN';
  lengthMiles: number;
  description: null;
  park: {
    id: number;
    name: string;
    state: string;
    slug: string;
  };
};

export type StaticParkRecord = {
  id: number;
  name: string;
  state: string;
  slug: string;
  trails: StaticTrailRecord[];
};

const parkCatalog = parks
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((park, parkIndex) => {
    const parkId = parkIndex + 1;
    const trails = (parkTrails[park.slug] ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((trail, trailIndex) => ({
        id: parkId * 1000 + trailIndex + 1,
        parkId,
        name: trail.name,
        slug: trail.slug,
        difficulty: trail.difficulty,
        status: 'OPEN' as const,
        lengthMiles: trail.lengthMiles,
        description: null,
        park: {
          id: parkId,
          name: park.name,
          state: park.state,
          slug: park.slug,
        },
      }));

    return {
      id: parkId,
      name: park.name,
      state: park.state,
      slug: park.slug,
      trails,
    };
  });

const trailCatalog = parkCatalog.flatMap((park) => park.trails);
const parkBySlug = new Map(parkCatalog.map((park) => [park.slug, park]));
const trailById = new Map(trailCatalog.map((trail) => [trail.id, trail]));

export function getStaticParks(): StaticParkRecord[] {
  return parkCatalog;
}

export function getStaticParkBySlug(slug: string): StaticParkRecord | undefined {
  return parkBySlug.get(slug);
}

export function getStaticTrails(): StaticTrailRecord[] {
  return trailCatalog;
}

export function getStaticTrailById(id: number): StaticTrailRecord | undefined {
  return trailById.get(id);
}
