import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { NpsModule } from '../nps/nps.module';
import { WeatherModule } from '../weather/weather.module';
import { AiController } from './ai.controller';
import { HazardsModule } from '../hazards/hazards.module';

@Module({
  imports: [NpsModule, WeatherModule, HazardsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
