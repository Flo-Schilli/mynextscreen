import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { ScreenService } from './screen.service';
import { ScreenSessionService } from './screen-session.service';
import { ScreenStateService } from './screen-state.service';
import { ScreenController } from './screen.controller';
import { ScreenPairingController } from './screen-pairing.controller';
import { ScreenPairingService } from './screen-pairing.service';
import { ScreenScheduler } from './screen.scheduler';
import { ScreenProtocolModule } from '../screen-protocol';
import { ScreenProtocolService } from '../screen-protocol/screen-protocol.service';
import { ScheduleBoundaryService } from './schedule-boundary.service';
import { PlaylistChangeBridgeService } from './playlist-change-bridge.service';
import { ScheduleEntryModule } from '../schedule';

@Module({
  imports: [CommonModule, AuthModule, ScreenProtocolModule, ScheduleEntryModule],
  controllers: [ScreenController, ScreenPairingController],
  providers: [
    ScreenSessionService,
    ScreenService,
    ScreenPairingService,
    ScreenStateService,
    ScheduleBoundaryService,
    PlaylistChangeBridgeService,
    ScreenScheduler,
    ScreenProtocolService,
  ],
  exports: [
    ScreenSessionService,
    ScreenService,
    ScreenStateService,
    ScreenProtocolService,
    // The site agent needs the next schedule start to wake a TV before playback.
    ScheduleBoundaryService,
  ],
})
export class ScreenModule {}
