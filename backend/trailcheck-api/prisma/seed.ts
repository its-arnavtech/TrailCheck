import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  //Parks
  const yosemite = await prisma.park.create({
    data: { name: "Yosemite", state: "CA", slug: "yosemite" }
  })

  const zion = await prisma.park.create({
    data: { name: "Zion", state: "UT", slug: "zion" }
  })

  const yellowstone = await prisma.park.create({
    data: { name: "Yellowstone", state: "WY", slug: "yellowstone" }
  })

  const grandCanyon = await prisma.park.create({
    data: { name: "Grand Canyon", state: "AZ", slug: "grand-canyon" }
  })

  const acadia = await prisma.park.create({
    data: { name: "Acadia", state: "ME", slug: "acadia" }
  })

  const bigBend = await prisma.park.create({
    data: { name: "Big Bend", state: "TX", slug: "big-bend" }
  })

  //Trails (1–2 per park)
  await prisma.trail.createMany({
    data: [
      { name: "Half Dome", slug: "half-dome", parkId: yosemite.id, difficulty: "HARD", lengthMiles: 14.2 },
      { name: "Mist Trail", slug: "mist-trail", parkId: yosemite.id, difficulty: "MODERATE", lengthMiles: 7 },

      { name: "Angels Landing", slug: "angels-landing", parkId: zion.id, difficulty: "HARD", lengthMiles: 5.4 },
      { name: "The Narrows", slug: "the-narrows", parkId: zion.id, difficulty: "MODERATE", lengthMiles: 9 },

      { name: "Fairy Falls", slug: "fairy-falls", parkId: yellowstone.id, difficulty: "EASY", lengthMiles: 5 },
      { name: "Mount Washburn", slug: "mount-washburn", parkId: yellowstone.id, difficulty: "MODERATE", lengthMiles: 6 },

      { name: "Bright Angel Trail", slug: "bright-angel", parkId: grandCanyon.id, difficulty: "HARD", lengthMiles: 12 },
      { name: "South Kaibab Trail", slug: "south-kaibab", parkId: grandCanyon.id, difficulty: "HARD", lengthMiles: 7 },

      { name: "Beehive Trail", slug: "beehive", parkId: acadia.id, difficulty: "MODERATE", lengthMiles: 1.5 },
      { name: "Cadillac Summit", slug: "cadillac-summit", parkId: acadia.id, difficulty: "EASY", lengthMiles: 2 },

      { name: "Lost Mine Trail", slug: "lost-mine", parkId: bigBend.id, difficulty: "MODERATE", lengthMiles: 4.8 },
      { name: "Santa Elena Canyon", slug: "santa-elena", parkId: bigBend.id, difficulty: "EASY", lengthMiles: 1.7 },
    ]
  })

  console.log("Seeded successfully")
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())