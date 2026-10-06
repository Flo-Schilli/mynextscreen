import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AgentHeartbeatDto } from './agent-heartbeat.dto';

function validate(body: Record<string, unknown>): { dto: AgentHeartbeatDto; errors: number } {
  const dto = plainToInstance(AgentHeartbeatDto, body);
  return { dto, errors: validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length };
}

const WIFI = { interfaceName: 'wlan0', kind: 'wifi', ssid: 'VenueNet', ipAddress: '10.0.0.23' };

describe('AgentHeartbeatDto.network', () => {
  it('accepts a full network report', () => {
    expect(validate({ agentVersion: '1.2.3', network: WIFI }).errors).toBe(0);
  });

  it('accepts unknown fields as null', () => {
    const network = { interfaceName: null, kind: 'unknown', ssid: null, ipAddress: null };
    expect(validate({ network }).errors).toBe(0);
  });

  it('accepts a heartbeat without a network report, as older agents send', () => {
    expect(validate({ agentVersion: '1.2.3' }).errors).toBe(0);
  });

  it.each([
    ['an unknown kind', { kind: 'modem' }],
    ['an address that is not one', { ipAddress: '999.1.1.1' }],
    ['an interface name with a slash', { interfaceName: '../eth0' }],
    ['an interface name that reads as an option', { interfaceName: '-h' }],
    ['an over-long SSID', { ssid: 'x'.repeat(65) }],
  ])('rejects %s', (_, override) => {
    expect(validate({ network: { ...WIFI, ...override } }).errors).toBeGreaterThan(0);
  });

  it('strips control characters from the SSID instead of rejecting the heartbeat', () => {
    const { dto, errors } = validate({ network: { ...WIFI, ssid: 'Venue\nNet\u0000' } });

    expect(errors).toBe(0);
    expect(dto.network?.ssid).toBe('VenueNet');
  });
});
