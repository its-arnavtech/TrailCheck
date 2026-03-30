import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create_report.dto';
import type { JwtUser } from '../auth/jwt.strategy';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() dto: CreateReportDto,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.reportsService.create(dto, req.user);
  }
}
