import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parkTrails } from '../../prisma/data/park-trails';
import { parks } from '../../prisma/data/parks';

@Injectable()
export class CatalogSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    if (!this.prisma.isAvailable()) {
      this.logger.warn(
        'Skipping park/trail catalog sync because the database is unavailable.',
      );
      return;
    }

    await this.syncCatalog();
  }

  private async syncCatalog() {
    const parkRecords = await Promise.all(
      parks.map((park) =>
        this.prisma.park.upsert({
          where: { slug: park.slug },
          update: {
            name: park.name,
            state: park.state,
          },
          create: park,
        }),
      ),
    );

    const parkIdBySlug = Object.fromEntries(
      parkRecords.map((park) => [park.slug, park.id]),
    ) as Record<string, number>;

    const trails = Object.entries(parkTrails).flatMap(([parkSlug, entries]) =>
      entries.map((trail) => ({
        ...trail,
        parkId: parkIdBySlug[parkSlug],
      })),
    );

    await Promise.all(
      trails.map((trail) =>
        this.prisma.trail.upsert({
          where: { slug: trail.slug },
          update: {
            parkId: trail.parkId,
            name: trail.name,
            difficulty: trail.difficulty,
            lengthMiles: trail.lengthMiles,
            status: 'OPEN',
            description: null,
          },
          create: {
            ...trail,
            status: 'OPEN',
            description: null,
          },
        }),
      ),
    );

    const parkSlugs = parkRecords.map((park) => park.slug);
    const trailSlugs = trails.map((trail) => trail.slug);

    const staleTrailSlugs = (
      await this.prisma.trail.findMany({
        where: {
          slug: {
            notIn: trailSlugs,
          },
        },
        select: {
          slug: true,
        },
      })
    ).map((trail) => trail.slug);

    if (staleTrailSlugs.length > 0) {
      await this.prisma.hazard.deleteMany({
        where: {
          trail: {
            slug: {
              in: staleTrailSlugs,
            },
          },
        },
      });

      await this.prisma.trailReport.deleteMany({
        where: {
          trail: {
            slug: {
              in: staleTrailSlugs,
            },
          },
        },
      });

      await this.prisma.trail.deleteMany({
        where: {
          slug: {
            in: staleTrailSlugs,
          },
        },
      });
    }

    const staleParkIds = (
      await this.prisma.park.findMany({
        where: {
          slug: {
            notIn: parkSlugs,
          },
        },
        select: {
          id: true,
        },
      })
    ).map((park) => park.id);

    if (staleParkIds.length > 0) {
      await this.prisma.userParkPreference.deleteMany({
        where: {
          parkId: {
            in: staleParkIds,
          },
        },
      });

      await this.prisma.parkSnapshot.deleteMany({
        where: {
          parkId: {
            in: staleParkIds,
          },
        },
      });

      await this.prisma.park.deleteMany({
        where: {
          id: {
            in: staleParkIds,
          },
        },
      });
    }

    this.logger.log(
      `Catalog sync complete: ${parkRecords.length} parks and ${trails.length} trails are now aligned with the seed catalog.`,
    );
  }
}
