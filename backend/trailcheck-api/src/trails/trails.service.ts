import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NpsService } from '../nps/nps.service';
import { WeatherService } from '../weather/weather.service';
import {
  getStaticTrailById,
  getStaticTrails,
} from '../catalog/static-park-data';

@Injectable()
export class TrailsService {
  constructor(
    private prisma: PrismaService,
    private nps: NpsService,
    private weather: WeatherService,
  ) {}

  async findAll() {
    if (!this.prisma.isAvailable()) {
      return getStaticTrails();
    }

    return this.prisma.trail.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        park: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const databaseAvailable = this.prisma.isAvailable();
    const trail = databaseAvailable
      ? await this.prisma.trail.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            difficulty: true,
            status: true,
            lengthMiles: true,
            description: true,
            park: {
              select: {
                slug: true,
                name: true,
              },
            },
            hazards: {
              where: { isActive: true },
              select: {
                id: true,
                type: true,
                severity: true,
                title: true,
                description: true,
                isActive: true,
                reportedAt: true,
              },
            },
            reports: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 5,
              select: {
                id: true,
                note: true,
                surfaceCondition: true,
                conditionRating: true,
                reporterName: true,
                createdAt: true,
              },
            },
          },
        })
      : (() => {
          const staticTrail = getStaticTrailById(id);
          if (!staticTrail) {
            return null;
          }

          return {
            ...staticTrail,
            hazards: [],
            reports: [],
          };
        })();

    if (!trail) {
      throw new NotFoundException(`Trail ${id} not found`);
    }

    //fetch live data. return null if sm fails.
    const [npsAlerts, weather] = await Promise.allSettled([
      this.nps.getAlertsPayloadForPark(trail.park.slug),
      this.weather.getWeatherForPark(trail.park.slug),
    ]);

    return {
      ...trail,
      dataAvailability: {
        hazards: databaseAvailable,
        reports: databaseAvailable,
        alerts:
          npsAlerts.status === 'fulfilled' && npsAlerts.value.raw !== null,
        weather: weather.status === 'fulfilled' && weather.value !== null,
      },
      npsAlerts: npsAlerts.status === 'fulfilled' ? npsAlerts.value.alerts : [],
      weather: weather.status === 'fulfilled' ? weather.value : null,
    };
  }
}
