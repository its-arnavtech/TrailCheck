import { Module } from '@nestjs/common';
import { ParksController } from './parks.controller';
import { ParksService } from './parks.service';
import { PrismaModule } from '../prisma/primsa.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParksController],
  providers: [ParksService]
})
export class ParksModule {}
