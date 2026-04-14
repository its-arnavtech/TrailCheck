import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'TrailCheck API is running.';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'trailcheck-api',
      timestamp: new Date().toISOString(),
    };
  }
}
