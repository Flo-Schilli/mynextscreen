import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentConfigStore, configCachePath } from './agent-config.store';
import type { AgentConfigMessage } from '../protocol/server-protocol';

describe('AgentConfigStore', () => {
  let stateDir: string;
  let store: AgentConfigStore;

  const config = {
    agentId: 'agent-1',
    organisationId: 'org-1',
    probeIntervalMs: 60_000,
    appId: 'com.mynextscreen.webos',
    screens: [{ screenId: 's1', devmodePassphrase: 'AEBC72' }],
  } as unknown as AgentConfigMessage;

  beforeEach(async () => {
    stateDir = await mkdtemp(join(tmpdir(), 'mns-cfg-'));
    store = new AgentConfigStore(configCachePath(stateDir));
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  it('returns null before anything was pulled', async () => {
    expect(await store.load()).toBeNull();
  });

  // The whole point of the cache: a venue must keep working when the uplink is
  // down, which means surviving a restart without the server.
  it('survives a restart', async () => {
    await store.save(config);

    const reopened = new AgentConfigStore(configCachePath(stateDir));

    expect(await reopened.load()).toEqual(config);
  });

  describe('updateScreenAddress', () => {
    it('replaces one screen address and keeps it across a restart', async () => {
      await store.save(config);

      await store.updateScreenAddress('s1', '192.168.1.77');

      const reopened = await new AgentConfigStore(configCachePath(stateDir)).load();
      expect(reopened?.screens[0]).toMatchObject({ screenId: 's1', localIp: '192.168.1.77' });
    });

    it('does not mutate the config it was given', async () => {
      await store.save(config);

      await store.updateScreenAddress('s1', '192.168.1.77');

      expect(config.screens[0]).not.toHaveProperty('localIp');
    });

    it('does nothing before a config was pulled', async () => {
      await store.updateScreenAddress('s1', '192.168.1.77');

      expect(store.current()).toBeNull();
    });
  });

  it('holds the passphrases owner-readable only', async () => {
    await store.save(config);

    expect((await stat(configCachePath(stateDir))).mode & 0o777).toBe(0o600);
  });

  it('tightens a file that already existed with looser permissions', async () => {
    await writeFile(configCachePath(stateDir), '{}', { mode: 0o644 });

    await store.save(config);

    expect((await stat(configCachePath(stateDir))).mode & 0o777).toBe(0o600);
  });

  // Unlike the credential, a damaged cache is recoverable: the next pull
  // rebuilds it, and refusing to start would be worse than starting blind.
  it('discards a corrupt cache instead of refusing to start', async () => {
    await writeFile(configCachePath(stateDir), 'not json', 'utf8');

    expect(await store.load()).toBeNull();
  });

  it('current() answers from memory without touching the disk', async () => {
    expect(store.current()).toBeNull();

    await store.save(config);

    expect(store.current()).toEqual(config);
  });

  it('clear() forgets it in memory and on disk', async () => {
    await store.save(config);

    await store.clear();

    expect(store.current()).toBeNull();
    expect(await new AgentConfigStore(configCachePath(stateDir)).load()).toBeNull();
  });
});
