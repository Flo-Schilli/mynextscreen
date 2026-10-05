import { Module } from '@nestjs/common';
import { DatabaseModule } from '../db/database.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PlayerAppsModule } from '../player-apps/player-apps.module';
import { ScreenModule } from '../screen';
import { SiteAgentController } from './site-agent.controller';
import { ScreenRemoteControlController } from './screen-remote-control.controller';
import { SiteAgentDeviceController } from './site-agent-device.controller';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { SiteAgentScheduler } from './site-agent.scheduler';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { SiteAgentConfigService } from './site-agent-config.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { ScreenRemoteCommandService } from './screen-remote-command.service';

@Module({
  imports: [DatabaseModule, CommonModule, AuthModule, UserModule, ScreenModule, PlayerAppsModule],
  controllers: [SiteAgentController, SiteAgentDeviceController, ScreenRemoteControlController],
  providers: [
    SiteAgentService,
    SiteAgentEnrolmentService,
    SiteAgentSessionService,
    SiteAgentScheduler,
    ScreenRemoteControlService,
    SiteAgentConfigService,
    SiteAgentSseService,
    ScreenRemoteCommandService,
  ],
  exports: [
    SiteAgentService,
    SiteAgentSessionService,
    ScreenRemoteControlService,
    SiteAgentSseService,
  ],
})
export class SiteAgentModule {}
