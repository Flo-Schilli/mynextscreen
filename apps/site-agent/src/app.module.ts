import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentEnv } from './agent-env';
import { ConnectionStore, connectionFilePath } from './connection/connection.store';
import { normaliseBaseUrl } from './connection/server-url';
import { ServerClient } from './connection/server-client.service';
import { AgentConfigStore, configCachePath } from './config/agent-config.store';
import { SetupController } from './setup/setup.controller';
import { SetupService } from './setup/setup.service';
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

/**
 * `MNS_SERVER_URL` in canonical form.
 *
 * Mandatory: pinning the address is what closes the rogue-server hole the old
 * boot PIN used to cover, so there is no unpinned path left. A missing or
 * malformed value fails at boot with a message naming the variable, rather than
 * at the first request with a stack trace.
 *
 * `https` is part of that: a pin to `http://` still hands the refresh token to
 * whoever answers the name, which on a venue LAN is not a theoretical attacker.
 * `MNS_ALLOW_INSECURE_SERVER_URL=true` opts out for local development.
 */
export function pinnedServerUrl(env: AgentEnv): string {
  const raw = env.serverUrl;
  if (!raw) {
    throw new Error(
      'MNS_SERVER_URL is required: set it to the address of the myNextScreen server ' +
        '(e.g. https://signage.example.com). The agent will not start without it.',
    );
  }
  let normalised: string;
  try {
    normalised = normaliseBaseUrl(raw);
  } catch (error) {
    throw new Error(
      `MNS_SERVER_URL is not usable: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (normalised.startsWith('http://') && !env.allowInsecureServerUrl) {
    throw new Error(
      'MNS_SERVER_URL must be an https:// address: over plain http the agent would ' +
        'hand its refresh token to whoever answers that name on the venue network. ' +
        'Set MNS_ALLOW_INSECURE_SERVER_URL=true only for local development.',
    );
  }

  return normalised;
}

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
      provide: ConnectionStore,
      useFactory: (env: AgentEnv) =>
        new ConnectionStore(connectionFilePath(env.stateDir), pinnedServerUrl(env)),
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
      // `pinnedServerUrl` has to reach this service as well as ConnectionStore:
      // without it the setup page shows no server and, because the form then
      // posts an empty address, enrolment fails validation before the service
      // ever gets to substitute the pinned one.
      useFactory: (
        connections: ConnectionStore,
        configs: AgentConfigStore,
        client: ServerClient,
        env: AgentEnv,
      ) => new SetupService(connections, configs, client, AGENT_VERSION, pinnedServerUrl(env)),
      inject: [ConnectionStore, AgentConfigStore, ServerClient, AgentEnv],
    },
  ],
})
export class AppModule {}
