import { Module } from '@nestjs/common';
import { TrailsController } from './trails.controller';
import { TrailsService } from './trails.service';
import { PrismaModule } from '../prisma/primsa.module';
import { NpsModule } from '../nps/nps.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [PrismaModule, NpsModule, WeatherModule],
  controllers: [TrailsController],
  providers: [TrailsService],
})
export class TrailsModule {}
