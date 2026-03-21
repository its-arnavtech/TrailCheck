import { Controller, Get, Param } from '@nestjs/common';
import { TrailsService } from './trails.service';

@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Get()
  findAll() {
    return this.trailsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trailsService.findOne(Number(id));
  }
}