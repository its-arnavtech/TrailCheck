import {
  Body,
  Controller,
  Get,
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
}
