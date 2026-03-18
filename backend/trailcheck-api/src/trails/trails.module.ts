import { Module } from '@nestjs/common';
import { TrailsController } from './trails.controller';
import { TrailsService } from './trails.service';
import { PrismaModule } from '../prisma/primsa.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrailsController],
  providers: [TrailsService]
})
export class TrailsModule {}
