import { Controller, Get } from '@nestjs/common';
import { TrailsService } from './trails.service';

@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Get()
  findAll() {
    return this.trailsService.findAll();
  }
}