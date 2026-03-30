import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from './screen.entity';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { ScreenController } from './screen.controller';
import { ScreenScheduler } from './screen.scheduler';
import { ScreenProtocolModule } from '../screen-protocol';
import { ScreenProtocolService } from '../screen-protocol/screen-protocol.service';
import { ScheduleEntryModule } from '../schedule';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Screen, ScreenGroup, SlicedRendition]),
    ScreenProtocolModule,
    ScheduleEntryModule,
  ],
  controllers: [ScreenController],
  providers: [ScreenService, ScreenStateService, ScreenScheduler, ScreenProtocolService],
  exports: [ScreenService, ScreenStateService, ScreenProtocolService, TypeOrmModule],
})
export class ScreenModule {}
