import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConnectionStore, connectionFilePath } from './connection.store';

describe('ConnectionStore', () => {
  let stateDir: string;
  let store: ConnectionStore;

  const connection = {
    serverUrl: 'https://signage.example.com',
    agentId: 'agent-1',
    organisationId: 'org-1',
    refreshToken: 'refresh-1',
  };

  beforeEach(async () => {
    stateDir = await mkdtemp(join(tmpdir(), 'mns-agent-'));
    store = new ConnectionStore(connectionFilePath(stateDir));
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('returns null before the agent has ever been enrolled', async () => {
      expect(await store.load()).toBeNull();
    });

    it('returns what was saved', async () => {
      await store.save(connection);

      expect(await new ConnectionStore(connectionFilePath(stateDir)).load()).toEqual(connection);
    });

    // "Never enrolled" and "the file is damaged" must not look the same: the
    // first sends the operator to the setup screen, the second would silently
    // discard a working session.
    it('throws rather than reporting "not enrolled" on a corrupt file', async () => {
      await store.save(connection);
      await writeFile(connectionFilePath(stateDir), '{ not json', 'utf8');

      await expect(new ConnectionStore(connectionFilePath(stateDir)).load()).rejects.toThrow();
    });
  });

  describe('save', () => {
    it('creates the state directory', async () => {
      const nested = new ConnectionStore(join(stateDir, 'deep', 'connection.json'));

      await nested.save(connection);

      expect(await nested.load()).toEqual(connection);
    });

    // The file holds a credential for one tenant; group and world have no business with it.
    it('writes the file owner-readable only', async () => {
      await store.save(connection);

      const mode = (await stat(connectionFilePath(stateDir))).mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('tightens the mode of a file that already existed with looser permissions', async () => {
      await writeFile(connectionFilePath(stateDir), '{}', { mode: 0o644 });

      await store.save(connection);

      expect((await stat(connectionFilePath(stateDir))).mode & 0o777).toBe(0o600);
    });
  });

  describe('updateRefreshToken', () => {
    it('replaces only the token', async () => {
      await store.save(connection);

      await store.updateRefreshToken('refresh-2');

      expect(await store.load()).toEqual({ ...connection, refreshToken: 'refresh-2' });
    });

    it('refuses before enrolment', async () => {
      await expect(store.updateRefreshToken('refresh-2')).rejects.toThrow(/before enrolment/);
    });

    it('survives a restart', async () => {
      await store.save(connection);
      await store.updateRefreshToken('refresh-2');

      const reopened = new ConnectionStore(connectionFilePath(stateDir));

      expect((await reopened.load())?.refreshToken).toBe('refresh-2');
    });
  });

  describe('clear', () => {
    it('forgets the session', async () => {
      await store.save(connection);

      await store.clear();

      expect(await store.load()).toBeNull();
    });

    it('is a no-op when nothing was stored', async () => {
      await expect(store.clear()).resolves.toBeUndefined();
    });

    it('leaves nothing on disk', async () => {
      await store.save(connection);

      await store.clear();

      await expect(readFile(connectionFilePath(stateDir), 'utf8')).rejects.toThrow();
    });
  });
});
