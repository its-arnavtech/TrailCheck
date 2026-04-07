import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParkPreferenceDto } from './dto/update-park-preference.dto';

@Injectable()
export class ParksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.park.findMany({
      orderBy: { name: 'asc' },
      include: {
        trails: {
          orderBy: { name: 'asc' },
          include: {
            park: true,
          },
        },
      },
    });
  }

  async getUserPreferences(userId: number) {
    await this.ensurePreferenceTableExists();

    const preferences = await this.prisma.userParkPreference.findMany({
      where: {
        userId,
        OR: [{ isFavorite: true }, { wantsToGo: true }],
      },
      include: {
        park: true,
      },
      orderBy: {
        park: {
          name: 'asc',
        },
      },
    });

    return preferences.map((preference) => ({
      parkId: preference.parkId,
      parkSlug: preference.park.slug,
      parkName: preference.park.name,
      parkState: preference.park.state,
      isFavorite: preference.isFavorite,
      wantsToGo: preference.wantsToGo,
    }));
  }

  async getUserPreferenceForPark(slug: string, userId: number) {
    await this.ensurePreferenceTableExists();

    const park = await this.prisma.park.findUnique({
      where: { slug },
    });

    if (!park) {
      throw new NotFoundException(`Park "${slug}" not found`);
    }

    const preference = await this.prisma.userParkPreference.findUnique({
      where: {
        userId_parkId: {
          userId,
          parkId: park.id,
        },
      },
    });

    return {
      parkId: park.id,
      parkSlug: park.slug,
      parkName: park.name,
      parkState: park.state,
      isFavorite: preference?.isFavorite ?? false,
      wantsToGo: preference?.wantsToGo ?? false,
    };
  }

  async updateUserPreference(
    slug: string,
    userId: number,
    dto: UpdateParkPreferenceDto,
  ) {
    await this.ensurePreferenceTableExists();

    const park = await this.prisma.park.findUnique({
      where: { slug },
    });

    if (!park) {
      throw new NotFoundException(`Park "${slug}" not found`);
    }

    if (!dto.isFavorite && !dto.wantsToGo) {
      await this.prisma.userParkPreference.deleteMany({
        where: {
          userId,
          parkId: park.id,
        },
      });

      return {
        parkId: park.id,
        parkSlug: park.slug,
        parkName: park.name,
        parkState: park.state,
        isFavorite: false,
        wantsToGo: false,
      };
    }

    const preference = await this.prisma.userParkPreference.upsert({
      where: {
        userId_parkId: {
          userId,
          parkId: park.id,
        },
      },
      update: {
        isFavorite: dto.isFavorite,
        wantsToGo: dto.wantsToGo,
      },
      create: {
        userId,
        parkId: park.id,
        isFavorite: dto.isFavorite,
        wantsToGo: dto.wantsToGo,
      },
    });

    return {
      parkId: park.id,
      parkSlug: park.slug,
      parkName: park.name,
      parkState: park.state,
      isFavorite: preference.isFavorite,
      wantsToGo: preference.wantsToGo,
    };
  }

  private async ensurePreferenceTableExists() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserParkPreference" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "userId" INTEGER NOT NULL,
        "parkId" INTEGER NOT NULL,
        "isFavorite" BOOLEAN NOT NULL DEFAULT false,
        "wantsToGo" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserParkPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "UserParkPreference_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserParkPreference_userId_parkId_key"
      ON "UserParkPreference"("userId", "parkId")
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserParkPreference_userId_idx"
      ON "UserParkPreference"("userId")
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserParkPreference_parkId_idx"
      ON "UserParkPreference"("parkId")
    `);
  }
}
