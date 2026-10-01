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
import { CommandStreamService } from './connection/command-stream.service';
import { ReachabilityService } from './probe/reachability.service';
import { DevmodeKeyService, devmodeKeyDir } from './tv/devmode-key.service';
import { SshService } from './tv/ssh.service';
import { WolService } from './tv/wol.service';
import { SsapKeyStore, ssapKeyDir } from './tv/ssap-key.store';
import { SupervisorService } from './supervisor/supervisor.service';
import { CommandHandlerService } from './supervisor/command-handler.service';

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
    CommandStreamService,
    ReachabilityService,
    SshService,
    WolService,
    CommandHandlerService,
    {
      provide: DevmodeKeyService,
      useFactory: (env: AgentEnv) => new DevmodeKeyService(devmodeKeyDir(env.stateDir)),
      inject: [AgentEnv],
    },
    {
      provide: SsapKeyStore,
      useFactory: (env: AgentEnv) => new SsapKeyStore(ssapKeyDir(env.stateDir)),
      inject: [AgentEnv],
    },
    {
      provide: SupervisorService,
      useFactory: (
        connections: ConnectionStore,
        client: ServerClient,
        configs: AgentConfigStore,
        setup: SetupService,
        reachability: ReachabilityService,
        devmodeKeys: DevmodeKeyService,
        ssh: SshService,
        wol: WolService,
        ssapKeys: SsapKeyStore,
      ) =>
        new SupervisorService(
          connections,
          client,
          configs,
          setup,
          reachability,
          devmodeKeys,
          ssh,
          wol,
          ssapKeys,
          AGENT_VERSION,
        ),
      inject: [
        ConnectionStore,
        ServerClient,
        AgentConfigStore,
        SetupService,
        ReachabilityService,
        DevmodeKeyService,
        SshService,
        WolService,
        SsapKeyStore,
      ],
    },
    {
      provide: SetupService,
      useFactory: (connections: ConnectionStore, configs: AgentConfigStore, client: ServerClient) =>
        new SetupService(connections, configs, client, AGENT_VERSION),
      inject: [ConnectionStore, AgentConfigStore, ServerClient],
    },
  ],
})
export class AppModule {}
