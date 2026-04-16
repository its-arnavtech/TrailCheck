import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ParksService } from './parks.service';
import type { JwtUser } from '../auth/jwt.strategy';
import { UpdateParkPreferenceDto } from './dto/update-park-preference.dto';

@Controller('parks')
export class ParksController {
  constructor(private readonly parksService: ParksService) {}

  @Get()
  findAll() {
    return this.parksService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('preferences/me')
  getMyPreferences(@Req() req: Request & { user: JwtUser }) {
    return this.parksService.getUserPreferences(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':slug/preferences')
  getPreferenceForPark(
    @Param('slug') slug: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.parksService.getUserPreferenceForPark(slug, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':slug/preferences')
  updatePreferenceForPark(
    @Param('slug') slug: string,
    @Body() dto: UpdateParkPreferenceDto,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.parksService.updateUserPreference(slug, req.user.id, dto);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const park = await this.parksService.findBySlug(slug);

    if (!park) {
      throw new NotFoundException(`Park "${slug}" not found`);
    }

    return park;
  }
}
