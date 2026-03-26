import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrailsModule } from './trails/trails.module';
import { ReportsModule } from './reports/reports.module';
import { HazardsModule } from './hazards/hazards.module';
import { ParksModule } from './parks/parks.module';
import { ConfigModule } from '@nestjs/config';
import { NpsService } from './nps/nps.service';
import { NpsModule } from './nps/nps.module';
import { WeatherService } from './weather/weather.service';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    TrailsModule, 
    ReportsModule, 
    HazardsModule, 
    ParksModule, NpsModule, WeatherModule],
  controllers: [AppController],
  providers: [AppService, NpsService, WeatherService],
})
export class AppModule {}
