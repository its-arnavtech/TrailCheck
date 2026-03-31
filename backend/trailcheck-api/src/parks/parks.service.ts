import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.park.findMany({
      orderBy: { name: 'asc' },
      include: {
        trails: {
          orderBy: { name: 'asc' },
          include: {
            park: true,
          },
        },
      },
    });
  }
}
