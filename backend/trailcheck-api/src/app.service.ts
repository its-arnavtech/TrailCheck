import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'TrailCheck API is running.';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'trailcheck-api',
      database: this.prisma.isAvailable() ? 'connected' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  }
}
