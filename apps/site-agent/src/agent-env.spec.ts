import { ConfigService } from '@nestjs/config';
import {
  AgentEnv,
  DEFAULT_CAPTURE_HLS_DIR,
  DEFAULT_CAPTURE_SOCKET,
  DEFAULT_SETUP_PORT,
  DEFAULT_STATE_DIR,
} from './agent-env';

describe('AgentEnv', () => {
  function envWith(values: Record<string, string>): AgentEnv {
    const config = {
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    } as unknown as ConfigService;
    return new AgentEnv(config);
  }

  describe('defaults', () => {
    it('reports no server address until MNS_SERVER_URL is set', () => {
      const env = envWith({});

      expect(env.serverUrl).toBeNull();
      expect(env.enrolmentToken).toBeNull();
    });

    it('uses the documented state directory and port', () => {
      const env = envWith({});

      expect(env.stateDir).toBe(DEFAULT_STATE_DIR);
      expect(env.setupPort).toBe(DEFAULT_SETUP_PORT);
    });
  });

  describe('overrides', () => {
    it('takes the server and token for unattended rollout', () => {
      const env = envWith({
        MNS_SERVER_URL: 'https://signage.example.com',
        MNS_ENROLMENT_TOKEN: 'token',
      });

      expect(env.serverUrl).toBe('https://signage.example.com');
      expect(env.enrolmentToken).toBe('token');
    });

    it('takes a state directory', () => {
      expect(envWith({ MNS_STATE_DIR: '/data' }).stateDir).toBe('/data');
    });

    // Documented as the way to run the agent with no inbound port at all.
    it('reads port 0 as "no setup interface"', () => {
      expect(envWith({ MNS_SETUP_PORT: '0' }).setupPort).toBe(0);
    });

    it('parses the port as a number, since the environment gives strings', () => {
      expect(envWith({ MNS_SETUP_PORT: '9999' }).setupPort).toBe(9999);
    });
  });

  describe('NDI and the capture plugin', () => {
    it('is enabled, with the shared-volume defaults', () => {
      const env = envWith({});

      expect(env.ndiEnabled).toBe(true);
      expect(env.captureSocket).toBe(DEFAULT_CAPTURE_SOCKET);
      expect(env.captureHlsDir).toBe(DEFAULT_CAPTURE_HLS_DIR);
    });

    it('is switched off only by an explicit false', () => {
      expect(envWith({ MNS_NDI_ENABLED: 'false' }).ndiEnabled).toBe(false);
      expect(envWith({ MNS_NDI_ENABLED: 'true' }).ndiEnabled).toBe(true);
      expect(envWith({ MNS_NDI_ENABLED: '0' }).ndiEnabled).toBe(true);
    });

    it('takes a socket path and an HLS directory', () => {
      const env = envWith({
        MNS_CAPTURE_SOCKET: ' /srv/capture/run/plugin.sock ',
        MNS_CAPTURE_HLS_DIR: '/srv/capture/hls',
      });

      expect(env.captureSocket).toBe('/srv/capture/run/plugin.sock');
      expect(env.captureHlsDir).toBe('/srv/capture/hls');
    });

    it('falls back for blank values', () => {
      const env = envWith({ MNS_CAPTURE_SOCKET: '  ', MNS_CAPTURE_HLS_DIR: '' });

      expect(env.captureSocket).toBe(DEFAULT_CAPTURE_SOCKET);
      expect(env.captureHlsDir).toBe(DEFAULT_CAPTURE_HLS_DIR);
    });
  });
});
