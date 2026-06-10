import { Module } from '@nestjs/common';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { ScreenController } from './screen.controller';
import { ScreenScheduler } from './screen.scheduler';
import { ScreenProtocolModule } from '../screen-protocol';
import { ScreenProtocolService } from '../screen-protocol/screen-protocol.service';
import { ScheduleBoundaryService } from './schedule-boundary.service';
import { PlaylistChangeBridgeService } from './playlist-change-bridge.service';
import { ScheduleEntryModule } from '../schedule';

@Module({
  imports: [ScreenProtocolModule, ScheduleEntryModule],
  controllers: [ScreenController],
  providers: [
    ScreenService,
    ScreenStateService,
    ScheduleBoundaryService,
    PlaylistChangeBridgeService,
    ScreenScheduler,
    ScreenProtocolService,
  ],
  exports: [ScreenService, ScreenStateService, ScreenProtocolService],
})
export class ScreenModule {}
