import { Module } from '@nestjs/common';
import { HazardsController } from './hazards.controller';
import { HazardsService } from './hazards.service';
import { NpsModule } from '../nps/nps.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [NpsModule, WeatherModule],
  controllers: [HazardsController],
  providers: [HazardsService],
  exports: [HazardsService],
})
export class HazardsModule {}
