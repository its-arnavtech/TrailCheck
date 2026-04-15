import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create_report.dto';
import type { JwtUser } from '../auth/jwt.strategy';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReportDto, user: JwtUser) {
    this.prisma.requireConnection();

    return this.prisma.trailReport.create({
      data: {
        ...dto,
        reporterName: user.email,
      },
    });
  }
}
