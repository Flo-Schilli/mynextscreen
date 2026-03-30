import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from './screen.entity';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { ScreenController } from './screen.controller';
import { ScreenScheduler } from './screen.scheduler';
import { ScreenProtocolModule } from '../screen-protocol';
import { ScheduleEntryModule } from '../schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([Screen]),
    ScreenProtocolModule,
    ScheduleEntryModule,
  ],
  controllers: [ScreenController],
  providers: [ScreenService, ScreenStateService, ScreenScheduler],
  exports: [ScreenService, ScreenStateService, TypeOrmModule],
})
export class ScreenModule {}
