import { SsapClient, SsapPairingTimeoutError, SsapUnreachableError } from './ssap-client';
import { startFakeSsapTv, type FakeSsapTv } from '../test/fakes/fake-ssap-tv';

describe('SsapClient', () => {
  let tv: FakeSsapTv;

  beforeEach(async () => {
    tv = await startFakeSsapTv();
  });

  afterEach(async () => {
    await tv.close();
  });

  async function connect(): Promise<SsapClient> {
    return SsapClient.connect('127.0.0.1', tv.port);
  }

  describe('connect', () => {
    it('reports a set that is not there rather than hanging', async () => {
      await expect(SsapClient.connect('127.0.0.1', 1)).rejects.toThrow(SsapUnreachableError);
    });
  });

  describe('register', () => {
    // The prompt is the one step of onboarding that cannot be done from the
    // dashboard — someone has to press OK on the remote, once per set.
    it('returns the client key the TV grants', async () => {
      const client = await connect();

      const key = await client.register(null);

      expect(key).toBe('granted-key');
      client.close();
    });

    it('announces the prompt so the operator knows to look at the TV', async () => {
      const client = await connect();
      const onPrompt = jest.fn();

      await client.register(null, onPrompt);

      expect(onPrompt).toHaveBeenCalled();
      client.close();
    });

    // With a stored key the set registers silently; that is what makes every
    // connection after the first one unattended.
    it('does not announce a prompt when a stored key is presented', async () => {
      const client = await connect();
      const onPrompt = jest.fn();

      await client.register('granted-key', onPrompt);

      expect(onPrompt).not.toHaveBeenCalled();
      client.close();
    });
  });

  describe('foregroundAppId', () => {
    it('reports what the set is showing', async () => {
      const client = await connect();
      await client.register('granted-key');

      expect(await client.foregroundAppId()).toBe('com.webos.app.livetv');
      client.close();
    });

    it('reports null when nothing is in the foreground', async () => {
      tv.foregroundAppId = null;
      const client = await connect();
      await client.register('granted-key');

      expect(await client.foregroundAppId()).toBeNull();
      client.close();
    });
  });

  describe('launch', () => {
    it('asks the set to start the app', async () => {
      const client = await connect();
      await client.register('granted-key');

      await client.launch('com.mynextscreen.webos');

      expect(tv.launched).toEqual(['com.mynextscreen.webos']);
      client.close();
    });

    it('surfaces an error the set returns', async () => {
      const client = await connect();
      await client.register('granted-key');

      await expect(client.request('ssap://nonsense')).rejects.toThrow(/unhandled/);
      client.close();
    });
  });

  describe('pairing timeout', () => {
    it('gives up when nobody confirms the prompt', async () => {
      jest.useFakeTimers();
      try {
        tv.grantKey = null;
        const client = await SsapClient.connect('127.0.0.1', tv.port);
        const pending = client.register(null);
        const assertion = expect(pending).rejects.toThrow(SsapPairingTimeoutError);

        await jest.advanceTimersByTimeAsync(61_000);
        await assertion;
        client.close();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
