import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NpsService } from '../nps/nps.service';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class TrailsService {
  constructor(
    private prisma: PrismaService,
    private nps: NpsService,
    private weather: WeatherService,
  ) {}

  async findAll() {
    return this.prisma.trail.findMany({
      include: {
        park: true,
      },
    });
  }

  async findOne(id: number) {
    const trail = await this.prisma.trail.findUnique({
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
    });

    if (!trail) {
      throw new NotFoundException(`Trail ${id} not found`);
    }

    //fetch live data. return null if sm fails.
    const [NpsAlerts, weather] = await Promise.allSettled([
      this.nps.getAlertsForPark(trail.park.slug),
      this.weather.getWeatherForPark(trail.park.slug),
    ]);

    return {
      ...trail,
      NpsAlerts: NpsAlerts.status === 'fulfilled' ? NpsAlerts.value : [],
      weather: weather.status === 'fulfilled' ? weather.value : null,
    };
  }
}
