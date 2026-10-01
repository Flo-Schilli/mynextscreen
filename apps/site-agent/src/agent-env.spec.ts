import { ConfigService } from '@nestjs/config';
import { AgentEnv, DEFAULT_SETUP_PORT, DEFAULT_STATE_DIR } from './agent-env';

describe('AgentEnv', () => {
  function envWith(values: Record<string, string>): AgentEnv {
    const config = {
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    } as unknown as ConfigService;
    return new AgentEnv(config);
  }

  describe('defaults', () => {
    it('needs no variables at all — the setup UI is the other way in', () => {
      const env = envWith({});

      expect(env.serverUrl).toBeNull();
      expect(env.enrolmentToken).toBeNull();
      expect(env.setupPin).toBeNull();
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

    it('takes a fixed PIN for deployments where nobody reads the log', () => {
      expect(envWith({ MNS_SETUP_PIN: 'fixed' }).setupPin).toBe('fixed');
    });
  });
});
