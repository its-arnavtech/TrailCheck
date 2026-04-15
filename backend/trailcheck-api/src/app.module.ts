import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrailsModule } from './trails/trails.module';
import { ReportsModule } from './reports/reports.module';
import { HazardsModule } from './hazards/hazards.module';
import { ParksModule } from './parks/parks.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NpsService } from './nps/nps.service';
import { NpsModule } from './nps/nps.module';
import { WeatherService } from './weather/weather.service';
import { WeatherModule } from './weather/weather.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { validateEnvironment } from './config/environment';
import { PrismaModule } from './prisma/primsa.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: Number(process.env.THROTTLE_TTL_SECONDS ?? 60) * 1000,
          limit: Number(process.env.THROTTLE_LIMIT ?? 120),
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
    NpsService,
    WeatherService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
