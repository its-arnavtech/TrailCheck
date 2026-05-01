import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrailsModule } from './trails/trails.module';
import { ReportsModule } from './reports/reports.module';
import { HazardsModule } from './hazards/hazards.module';
import { ParksModule } from './parks/parks.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { NpsService } from './nps/nps.service';
import { NpsModule } from './nps/nps.module';
import { WeatherService } from './weather/weather.service';
import { WeatherModule } from './weather/weather.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { validateEnvironment } from './config/environment';
import { PrismaModule } from './prisma/primsa.module';
import { CatalogSyncService } from './catalog/catalog-sync.service';
import { RouteTimingInterceptor } from './common/interceptors/route-timing.interceptor';
import { ApiThrottlerGuard } from './common/guards/api-throttler.guard';

const ENV_FILE_CANDIDATES = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'backend/trailcheck-api/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(__dirname, '..', '..', '.env'),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE_CANDIDATES,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get<number>('RATE_LIMIT_LIMIT', 100),
        },
      ],
    }),
    TrailsModule,
    ReportsModule,
    HazardsModule,
    ParksModule,
    NpsModule,
    WeatherModule,
    AuthModule,
    AiModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CatalogSyncService,
    NpsService,
    WeatherService,
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RouteTimingInterceptor,
    },
  ],
})
export class AppModule {}
