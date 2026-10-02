import { AppModule, pinnedServerUrl } from './app.module';
import { AgentEnv } from './agent-env';
import { ConnectionStore } from './connection/connection.store';
import { AgentConfigStore } from './config/agent-config.store';
import { ServerClient } from './connection/server-client.service';
import { SetupService } from './setup/setup.service';

/**
 * The providers are built by hand rather than by booting the module: compiling
 * AppModule would start the schedule and the supervisor, and the thing worth
 * testing here is only which arguments each factory receives.
 */
interface ProviderDefinition {
  provide: unknown;
  useFactory: (...args: unknown[]) => unknown;
  inject: unknown[];
}

function providerFor(token: unknown): ProviderDefinition {
  const providers = Reflect.getMetadata('providers', AppModule) as ProviderDefinition[];
  const found = providers.find((provider) => provider?.provide === token);
  if (!found) {
    throw new Error(`No factory provider registered for ${String(token)}`);
  }
  return found;
}

/**
 * Calls a provider's factory with stubs resolved by its own `inject` list, so a
 * dependency that is declared in the wrong order fails here too — not just one
 * that is missing.
 */
function buildWith(token: unknown, stubs: Map<unknown, unknown>): unknown {
  const provider = providerFor(token);
  const args = provider.inject.map((dependency) => {
    if (!stubs.has(dependency)) {
      throw new Error(`Factory asked for an unexpected dependency: ${String(dependency)}`);
    }
    return stubs.get(dependency);
  });
  return provider.useFactory(...args);
}

describe('AppModule wiring', () => {
  const serverUrl = 'https://signage.example.com';

  function stubs(env: Partial<AgentEnv>): Map<unknown, unknown> {
    return new Map<unknown, unknown>([
      [AgentEnv, env],
      [ConnectionStore, { load: jest.fn().mockResolvedValue(null), isServerUrlPinned: true }],
      [AgentConfigStore, { current: jest.fn().mockReturnValue(null) }],
      [ServerClient, { enrol: jest.fn() }],
    ]);
  }

  describe('SetupService', () => {
    it('is given the pinned server address, so the setup page can show it', async () => {
      const service = buildWith(SetupService, stubs({ serverUrl } as AgentEnv)) as SetupService;

      const status = await service.status();

      expect(status.serverUrl).toBe(serverUrl);
    });

    it('enrols against the pinned address even when the form posts none', async () => {
      const client = { enrol: jest.fn().mockResolvedValue({ agentId: 'agent-1' }) };
      const map = stubs({ serverUrl } as AgentEnv);
      map.set(ServerClient, client);

      const service = buildWith(SetupService, map) as SetupService;
      await service.enrol(undefined, 'token-1');

      expect(client.enrol).toHaveBeenCalledWith(serverUrl, 'token-1');
    });

    it('leaves the address to the form when nothing is pinned', async () => {
      const service = buildWith(
        SetupService,
        stubs({ serverUrl: null } as unknown as AgentEnv),
      ) as SetupService;

      const status = await service.status();

      expect(status.serverUrl).toBeNull();
    });
  });

  describe('pinnedServerUrl', () => {
    it('names the variable when the value cannot be parsed', () => {
      expect(() => pinnedServerUrl({ serverUrl: 'not a url' } as AgentEnv)).toThrow(
        /MNS_SERVER_URL/,
      );
    });
  });
});
