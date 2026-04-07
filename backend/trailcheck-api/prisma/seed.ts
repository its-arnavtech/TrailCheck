import { PrismaClient } from '@prisma/client';
import { parks } from './data/parks';
import { parkTrails } from './data/park-trails';

const prisma = new PrismaClient();

function validateSeedData() {
  const parkSlugs = new Set(parks.map((park) => park.slug));
  const trailParkSlugs = Object.keys(parkTrails);

  const missingTrailLists = parks
    .filter((park) => !parkTrails[park.slug])
    .map((park) => park.slug);
  const missingParkMetadata = trailParkSlugs.filter((slug) => !parkSlugs.has(slug));

  if (missingTrailLists.length === 0 && missingParkMetadata.length === 0) {
    return;
  }

  const problems = [
    missingTrailLists.length > 0
      ? `Missing trail definitions for: ${missingTrailLists.join(', ')}`
      : null,
    missingParkMetadata.length > 0
      ? `Missing park metadata in parks.ts for: ${missingParkMetadata.join(', ')}`
      : null,
  ].filter(Boolean);

  throw new Error(`Seed data is out of sync.\n${problems.join('\n')}`);
}

async function main() {
  validateSeedData();

  const parkRecords = await Promise.all(
    parks.map((park) =>
      prisma.park.upsert({
        where: { slug: park.slug },
        update: { name: park.name, state: park.state },
        create: park,
      }),
    ),
  );

  const parkIds = Object.fromEntries(
    parkRecords.map((park) => [park.slug, park.id]),
  ) as Record<string, number>;

  const trails = Object.entries(parkTrails).flatMap(([parkSlug, entries]) =>
    entries.map((trail) => ({
      ...trail,
      parkId: parkIds[parkSlug],
    })),
  );
  const trailSlugs = trails.map((trail) => trail.slug);
  const parkSlugs = parkRecords.map((park) => park.slug);

  await Promise.all(
    trails.map((trail) =>
      prisma.trail.upsert({
        where: { slug: trail.slug },
        update: {
          parkId: trail.parkId,
          name: trail.name,
          difficulty: trail.difficulty,
          lengthMiles: trail.lengthMiles,
        },
        create: trail,
      }),
    ),
  );

  await prisma.trail.deleteMany({
    where: {
      slug: {
        notIn: trailSlugs,
      },
    },
  });

  await prisma.park.deleteMany({
    where: {
      slug: {
        notIn: parkSlugs,
      },
    },
  });

  console.log(`Seeded successfully with ${parkRecords.length} parks and ${trails.length} trails`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
