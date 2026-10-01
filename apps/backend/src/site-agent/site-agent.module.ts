import { Module } from '@nestjs/common';
import { DatabaseModule } from '../db/database.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SiteAgentController } from './site-agent.controller';
import { SiteAgentDeviceController } from './site-agent-device.controller';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { SiteAgentScheduler } from './site-agent.scheduler';

@Module({
  imports: [DatabaseModule, AuthModule, UserModule],
  controllers: [SiteAgentController, SiteAgentDeviceController],
  providers: [
    SiteAgentService,
    SiteAgentEnrolmentService,
    SiteAgentSessionService,
    SiteAgentScheduler,
  ],
  exports: [SiteAgentService, SiteAgentSessionService],
})
export class SiteAgentModule {}
