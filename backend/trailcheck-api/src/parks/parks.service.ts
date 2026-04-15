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
