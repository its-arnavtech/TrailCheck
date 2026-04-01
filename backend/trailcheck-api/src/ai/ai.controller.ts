import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { AskDto } from './dto/ask.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  ask(@Body() dto: AskDto) {
    return this.aiService.ask(dto);
  }

  @Get('parks/:parkSlug/digest')
  getParkDigest(@Param('parkSlug') parkSlug: string) {
    return this.aiService.generateParkDigest(parkSlug);
  }
}
