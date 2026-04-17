import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParkPreferenceDto } from './dto/update-park-preference.dto';
import { getStaticParkBySlug, getStaticParks } from '../catalog/static-park-data';

@Injectable()
export class ParksService {
  constructor(private readonly prisma: PrismaService) {}

  private isRecoverableReadError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    );
  }

  async findAll() {
    if (!this.prisma.isAvailable()) {
      return getStaticParks();
    }

    try {
      return await this.prisma.park.findMany({
        orderBy: { name: 'asc' },
        select: {
          name: true,
          state: true,
          slug: true,
          trails: {
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      if (this.isRecoverableReadError(error)) {
        return getStaticParks();
      }

      throw error;
    }
  }

  async findBySlug(slug: string) {
    if (!this.prisma.isAvailable()) {
      return getStaticParkBySlug(slug) ?? null;
    }

    try {
      return await this.prisma.park.findUnique({
        where: { slug },
        select: {
          name: true,
          state: true,
          slug: true,
          trails: {
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      if (this.isRecoverableReadError(error)) {
        return getStaticParkBySlug(slug) ?? null;
      }

      throw error;
    }
  }

  async getUserPreferences(userId: number) {
    this.prisma.requireConnection();

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
    this.prisma.requireConnection();

    const park = await this.prisma.park.findUnique({
      where: { slug },
    });

    if (!park) {
      const staticPark = getStaticParkBySlug(slug);
      if (!staticPark) {
        throw new NotFoundException(`Park "${slug}" not found`);
      }
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
    this.prisma.requireConnection();

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
}
