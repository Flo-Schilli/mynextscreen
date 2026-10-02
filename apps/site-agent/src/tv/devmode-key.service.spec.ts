import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DevmodeKeyService, devmodeKeyDir } from './devmode-key.service';
import { startFakeKeyServer, type FakeKeyServer } from '../test/fakes/fake-key-server';

describe('DevmodeKeyService', () => {
  let stateDir: string;
  let service: DevmodeKeyService;
  let tv: FakeKeyServer;

  // A real UUID: the store refuses anything else as a file name, because the
  // id arrives in the server's configuration and is used to build a path.
  const screenId = '7f1c2f3e-9a4b-4c5d-8e6f-0a1b2c3d4e5f';

  beforeAll(async () => {
    tv = await startFakeKeyServer('AEBC72');
  });

  afterAll(async () => {
    await tv.close();
  });

  beforeEach(async () => {
    stateDir = await mkdtemp(join(tmpdir(), 'mns-keys-'));
    service = new DevmodeKeyService(devmodeKeyDir(stateDir));
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  // The service always builds `http://<host>:9991/webos_rsa`, so the fake's
  // ephemeral port is not reachable through it. The network paths are therefore
  // covered against a port with nothing listening, and the decrypt logic — the
  // part that tells a wrong passphrase from an absent TV — against a seeded
  // cache holding the fake's real encrypted key.
  describe('without a passphrase', () => {
    it('says so rather than failing against the TV', async () => {
      expect(await service.obtain(screenId, '127.0.0.1', null)).toEqual({
        status: 'no_passphrase',
      });
    });
  });

  describe('without an address', () => {
    it('reports unreachable and does not try', async () => {
      const result = await service.obtain(screenId, null, 'AEBC72');

      expect(result.status).toBe('unreachable');
      expect(result.detail).toMatch(/No address/);
    });
  });

  describe('against an unreachable host', () => {
    it('reports the key server as off when the connection is refused', async () => {
      // Port 9991 on loopback with nothing listening refuses immediately, which
      // is exactly what a TV with the key server switched off does.
      const result = await service.obtain(screenId, '127.0.0.1', 'AEBC72');

      expect(result.status).toBe('key_server_off');
      expect(result.detail).toContain('9991');
    });
  });

  /**
   * The wizard checks the key server one step before it asks for the
   * passphrase, so this path must never report `no_passphrase` — doing so left
   * the wizard unable to get past its own fourth step.
   */
  describe('probeKeyServer', () => {
    it('answers without a passphrase', async () => {
      const result = await service.probeKeyServer('127.0.0.1');

      expect(result.status).not.toBe('no_passphrase');
      expect(result.status).toBe('key_server_off');
      expect(result.detail).toContain('9991');
    });

    it('reports unreachable when no address is configured', async () => {
      const result = await service.probeKeyServer(null);

      expect(result.status).toBe('unreachable');
      expect(result.detail).toMatch(/No address/);
    });

    it('never hands back a key, since no passphrase has been checked against it', async () => {
      const result = await service.probeKeyServer('127.0.0.1');

      expect(result.privateKey).toBeUndefined();
    });
  });

  describe('caching', () => {
    it('does not write anything when the fetch failed', async () => {
      await service.obtain(screenId, '127.0.0.1', 'AEBC72');

      await expect(stat(join(devmodeKeyDir(stateDir), `${screenId}.pem`))).rejects.toThrow();
    });

    it('forget() is safe when nothing was cached', async () => {
      await expect(service.forget(screenId)).resolves.toBeUndefined();
    });
  });

  // Exercising the happy path needs the service to reach the fake's ephemeral
  // port, which the real key-server port constant does not allow. The decrypt
  // logic itself is covered through a cached key below.
  describe('with a cached key', () => {
    async function seedCache(pem: string): Promise<void> {
      const { mkdir, writeFile } = await import('node:fs/promises');
      await mkdir(devmodeKeyDir(stateDir), { recursive: true });
      await writeFile(join(devmodeKeyDir(stateDir), `${screenId}.pem`), pem, { mode: 0o600 });
    }

    it('uses it when the passphrase opens it, without touching the network', async () => {
      await seedCache(tv.pem);

      const result = await service.obtain(screenId, null, tv.passphrase);

      expect(result.status).toBe('ok');
      expect(result.privateKey).toBe(tv.pem);
    });

    // Developer Mode re-issues the key when it is switched on again, so a
    // cached key that no longer opens is a normal event, not corruption.
    it('refetches when the passphrase no longer opens it', async () => {
      await seedCache(tv.pem);

      const result = await service.obtain(screenId, null, 'WRONG1');

      expect(result.status).toBe('unreachable');
    });

    it('is stored owner-readable only', async () => {
      await seedCache(tv.pem);

      const mode = (await stat(join(devmodeKeyDir(stateDir), `${screenId}.pem`))).mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('forget() removes it', async () => {
      await seedCache(tv.pem);

      await service.forget(screenId);

      await expect(
        readFile(join(devmodeKeyDir(stateDir), `${screenId}.pem`), 'utf8'),
      ).rejects.toThrow();
    });
  });
});
