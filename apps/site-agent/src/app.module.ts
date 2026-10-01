import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentEnv } from './agent-env';
import { ConnectionStore, connectionFilePath } from './connection/connection.store';
import { ServerClient } from './connection/server-client.service';
import { AgentConfigStore, configCachePath } from './config/agent-config.store';
import { SetupController } from './setup/setup.controller';
import { SetupService } from './setup/setup.service';
import { SetupPinService } from './setup/setup-pin.service';
import { SetupAuthGuard } from './setup/setup-auth.guard';

/** Reported on heartbeat and shown on the setup page. Injected at build time. */
export const AGENT_VERSION = process.env.APP_VERSION ?? '0.0.0-dev';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot()],
  controllers: [SetupController],
  providers: [
    SetupAuthGuard,
    {
      provide: AgentEnv,
      useFactory: (config: ConfigService) => new AgentEnv(config),
      inject: [ConfigService],
    },
    {
      provide: SetupPinService,
      useFactory: (env: AgentEnv) => new SetupPinService(env.setupPin),
      inject: [AgentEnv],
    },
    {
      provide: ConnectionStore,
      useFactory: (env: AgentEnv) => new ConnectionStore(connectionFilePath(env.stateDir)),
      inject: [AgentEnv],
    },
    {
      provide: AgentConfigStore,
      useFactory: (env: AgentEnv) => new AgentConfigStore(configCachePath(env.stateDir)),
      inject: [AgentEnv],
    },
    ServerClient,
    {
      provide: SetupService,
      useFactory: (connections: ConnectionStore, configs: AgentConfigStore, client: ServerClient) =>
        new SetupService(connections, configs, client, AGENT_VERSION),
      inject: [ConnectionStore, AgentConfigStore, ServerClient],
    },
  ],
})
export class AppModule {}
