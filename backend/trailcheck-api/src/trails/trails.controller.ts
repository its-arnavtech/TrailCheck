import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TrailsService } from './trails.service';

@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Get()
  findAll() {
    return this.trailsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trailsService.findOne(id);
  }
}
