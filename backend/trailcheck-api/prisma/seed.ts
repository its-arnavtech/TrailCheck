import { PrismaClient } from '@prisma/client';
import { parks } from './data/parks';
import { parkTrails } from './data/park-trails';

const prisma = new PrismaClient();
const obsoleteParkSlugs = ['yellowstone'];

async function main() {
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

  await prisma.park.deleteMany({
    where: {
      slug: {
        in: obsoleteParkSlugs,
      },
    },
  });

  console.log(`Seeded successfully with ${parkRecords.length} parks and ${trails.length} trails`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
