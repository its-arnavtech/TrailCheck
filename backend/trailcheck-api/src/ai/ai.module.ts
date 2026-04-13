import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { NpsModule } from '../nps/nps.module';
import { WeatherModule } from '../weather/weather.module';
import { AiController } from './ai.controller';
import { HazardsModule } from '../hazards/hazards.module';
import { PrismaModule } from '../prisma/primsa.module';
import { LocalModelService } from './local-model.service';

@Module({
  imports: [NpsModule, WeatherModule, HazardsModule, PrismaModule],
  controllers: [AiController],
  providers: [AiService, LocalModelService],
  exports: [AiService],
})
export class AiModule {}
