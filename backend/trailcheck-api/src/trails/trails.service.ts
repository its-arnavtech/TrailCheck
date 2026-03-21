import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrailsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.trail.findMany({
      include: {
        park: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.trail.findUnique({
      where: { id },
      include: {
        park: true,
        hazards: true,
        reports: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });
  }
}