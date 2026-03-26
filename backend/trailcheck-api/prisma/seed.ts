import { PrismaClient } from '@prisma/client';
import { parkTrails } from './data/park-trails';

const prisma = new PrismaClient();

async function main() {
  const yosemite = await prisma.park.create({
    data: { name: 'Yosemite', state: 'CA', slug: 'yosemite' },
  });

  const zion = await prisma.park.create({
    data: { name: 'Zion', state: 'UT', slug: 'zion' },
  });

  const yellowstone = await prisma.park.create({
    data: { name: 'Yellowstone', state: 'WY', slug: 'yellowstone' },
  });

  const grandCanyon = await prisma.park.create({
    data: { name: 'Grand Canyon', state: 'AZ', slug: 'grand-canyon' },
  });

  const acadia = await prisma.park.create({
    data: { name: 'Acadia', state: 'ME', slug: 'acadia' },
  });

  const bigBend = await prisma.park.create({
    data: { name: 'Big Bend', state: 'TX', slug: 'big-bend' },
  });

  const parkIds = {
    yosemite: yosemite.id,
    zion: zion.id,
    yellowstone: yellowstone.id,
    'grand-canyon': grandCanyon.id,
    acadia: acadia.id,
    'big-bend': bigBend.id,
  };

  const trails = Object.entries(parkTrails).flatMap(([parkSlug, entries]) =>
    entries.map((trail) => ({
      ...trail,
      parkId: parkIds[parkSlug as keyof typeof parkIds],
    })),
  );

  await prisma.trail.createMany({
    data: trails,
  });

  console.log(`Seeded successfully with ${trails.length} trails`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
