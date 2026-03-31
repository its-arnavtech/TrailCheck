import { Controller, Get } from '@nestjs/common';
import { ParksService } from './parks.service';

@Controller('parks')
export class ParksController {
  constructor(private readonly parksService: ParksService) {}

  @Get()
  findAll() {
    return this.parksService.findAll();
  }
}
