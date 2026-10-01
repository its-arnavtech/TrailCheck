import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AskDto } from './dto/ask.dto';
import { SlugValidationPipe } from '../common/pipes/slug-validation.pipe';
import { AiRateLimitGuard } from './ai-rate-limit.guard';

@Controller('ai')
@UseGuards(AiRateLimitGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  ask(@Body() dto: AskDto) {
    return this.aiService.ask(dto);
  }

  @Get('parks/:parkSlug/digest')
  getParkDigest(@Param('parkSlug', SlugValidationPipe) parkSlug: string) {
    return this.aiService.generateParkDigest(parkSlug);
  }
}
