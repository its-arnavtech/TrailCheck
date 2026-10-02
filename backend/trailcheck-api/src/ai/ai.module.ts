import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { NpsModule } from '../nps/nps.module';
import { WeatherModule } from '../weather/weather.module';
import { AiController } from './ai.controller';
import { HazardsModule } from '../hazards/hazards.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalModelService } from './local-model.service';
import { AiRateLimitGuard } from './ai-rate-limit.guard';

@Module({
  imports: [NpsModule, WeatherModule, HazardsModule, PrismaModule],
  controllers: [AiController],
  providers: [AiService, LocalModelService, AiRateLimitGuard],
  exports: [AiService],
})
export class AiModule {}
