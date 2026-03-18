import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrailsModule } from './trails/trails.module';
import { ReportsModule } from './reports/reports.module';
import { HazardsModule } from './hazards/hazards.module';
import { ParksModule } from './parks/parks.module';

@Module({
  imports: [TrailsModule, ReportsModule, HazardsModule, ParksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
