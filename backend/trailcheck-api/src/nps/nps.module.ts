import { Module } from '@nestjs/common';
import { NpsService } from './nps.service';

@Module({
    providers: [NpsService],
    exports: [NpsService],
})
export class NpsModule {}
