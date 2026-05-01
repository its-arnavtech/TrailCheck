import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AskDto } from './dto/ask.dto';
import { SlugValidationPipe } from '../common/pipes/slug-validation.pipe';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  @Post('ask')
  ask(@Body() dto: AskDto) {
    return this.aiService.ask(dto);
  }

  @Get('parks/:parkSlug/digest')
  getParkDigest(@Param('parkSlug', SlugValidationPipe) parkSlug: string) {
    return this.aiService.generateParkDigest(parkSlug);
  }
}
