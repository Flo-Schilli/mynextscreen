import { EXTEND_DEVMODE_COMMAND, SshService } from './ssh.service';
import { startFakeSshTv, type FakeSshTv } from '../test/fakes/fake-ssh-tv';

describe('SshService', () => {
  const service = new SshService();
  let tv: FakeSshTv;

  beforeEach(async () => {
    tv = await startFakeSshTv();
  });

  afterEach(async () => {
    await tv.close();
  });

  function target(overrides: Partial<Parameters<SshService['run']>[0]> = {}) {
    return {
      host: '127.0.0.1',
      privateKey: tv.clientKeyPem,
      passphrase: tv.passphrase,
      expectedHostKeyFingerprint: null,
      port: tv.port,
      ...overrides,
    };
  }

  describe('run', () => {
    it('runs the command and returns its output', async () => {
      tv.stdout = 'hello\n';

      const result = await service.run(target(), 'echo hello');

      expect(result.status).toBe('ok');
      expect(result.stdout).toContain('hello');
      expect(tv.commands).toEqual(['echo hello']);
    });

    it('reports the host key so it can be pinned on first use', async () => {
      const result = await service.run(target(), 'echo hi');

      expect(result.hostKeyFingerprint).toMatch(/^SHA256:/);
    });

    // A factory reset is the benign cause. The other one is worth a human
    // looking at it, so it is never accepted silently.
    it('refuses to connect when the host key changed', async () => {
      const result = await service.run(
        target({ expectedHostKeyFingerprint: 'SHA256:somethingelse' }),
        'echo hi',
      );

      expect(result.status).toBe('host_key_mismatch');
      expect(result.detail).toContain('SHA256:somethingelse');
      expect(tv.commands).toEqual([]);
    });

    it('accepts a host key that matches the pin', async () => {
      const first = await service.run(target(), 'echo hi');

      const second = await service.run(
        target({ expectedHostKeyFingerprint: first.hostKeyFingerprint as string }),
        'echo hi',
      );

      expect(second.status).toBe('ok');
    });

    // The operator's fix for this is to re-fetch the key, which is a different
    // action from "check the network", so the two must not look alike.
    it('reports a rejected key as an authentication failure', async () => {
      tv.acceptAuth = false;

      const result = await service.run(target(), 'echo hi');

      expect(result.status).toBe('auth_failed');
    });

    it('reports a set that is not there as unreachable', async () => {
      const result = await service.run(target({ port: 1 }), 'echo hi');

      expect(result.status).toBe('unreachable');
    });

    it('never throws, whatever the set does', async () => {
      await expect(service.run(target({ host: '203.0.113.1' }), 'echo hi')).resolves.toBeDefined();
    });
  });

  describe('extendDevmode', () => {
    // This exact Luna call is what the "Extend Session Time" button on the TV
    // does. The same call over SSAP is acked and does nothing — verified on a
    // real set, which is why it lives here and not on the SSAP client.
    it('sends the Luna call over the public bus', () => {
      expect(EXTEND_DEVMODE_COMMAND).toContain('luna-send-pub');
      expect(EXTEND_DEVMODE_COMMAND).toContain('com.palmdts.devmode');
      expect(EXTEND_DEVMODE_COMMAND).toContain('"extend":true');
    });

    it('reads success off the TV own return value', async () => {
      const result = await service.extendDevmode(target());

      expect(result.extended).toBe(true);
      expect(tv.commands[0]).toBe(EXTEND_DEVMODE_COMMAND);
    });

    // The set's displayed countdown updates with a long delay, so the Luna
    // return value is the only honest signal — and anything else is a failure.
    it('does not claim success when the set answers with something else', async () => {
      tv.stdout = '{"returnValue":false}\n';

      expect((await service.extendDevmode(target())).extended).toBe(false);
    });

    it('does not claim success when the set never answered', async () => {
      const result = await service.extendDevmode(target({ port: 1 }));

      expect(result.extended).toBe(false);
    });
  });
});
