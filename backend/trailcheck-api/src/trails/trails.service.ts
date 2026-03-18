import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TrailsService {
    constructor(private prisma: PrismaService){}

    async findAll(){
        return this.prisma.trail.findMany({
            include: {
                park: true,
            },
        })
    }
}
