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
      include: {
        park: true,
      },
    });
  }

  async findOne(id: number) {
    const trail = this.prisma.isAvailable()
      ? await this.prisma.trail.findUnique({
          where: { id },
          include: {
            park: true,
            hazards: true,
            reports: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 5,
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
      this.nps.getAlertsForPark(trail.park.slug),
      this.weather.getWeatherForPark(trail.park.slug),
    ]);

    return {
      ...trail,
      npsAlerts: npsAlerts.status === 'fulfilled' ? npsAlerts.value : [],
      weather: weather.status === 'fulfilled' ? weather.value : null,
    };
  }
}
