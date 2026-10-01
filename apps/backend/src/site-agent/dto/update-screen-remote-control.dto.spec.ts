import { validate } from 'class-validator';
import {
  DEVMODE_INTERVAL_MAX_DAYS,
  DEVMODE_INTERVAL_MIN_DAYS,
  UpdateScreenRemoteControlDto,
} from './update-screen-remote-control.dto';

function createDto(
  overrides: Partial<UpdateScreenRemoteControlDto> = {},
): UpdateScreenRemoteControlDto {
  const dto = new UpdateScreenRemoteControlDto();
  Object.assign(dto, overrides);
  return dto;
}

async function errorsFor(overrides: Partial<UpdateScreenRemoteControlDto>): Promise<string[]> {
  const errors = await validate(createDto(overrides));
  return errors.map((e) => e.property);
}

describe('UpdateScreenRemoteControlDto', () => {
  it('accepts an empty payload — every field is optional', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  describe('devmodeExtendIntervalDays', () => {
    it.each([DEVMODE_INTERVAL_MIN_DAYS, 7, DEVMODE_INTERVAL_MAX_DAYS])(
      'accepts %i days',
      async (days) => {
        expect(await errorsFor({ devmodeExtendIntervalDays: days })).toEqual([]);
      },
    );

    // Below 1 is meaningless; above 40 the Developer Mode session (~1000h ≈
    // 41.7 days) can expire between two extension attempts, and the TV deletes
    // the installed app when it does.
    it.each([0, -1, 41, 365])('rejects %i days', async (days) => {
      expect(await errorsFor({ devmodeExtendIntervalDays: days })).toEqual([
        'devmodeExtendIntervalDays',
      ]);
    });

    it('rejects a fractional interval', async () => {
      expect(await errorsFor({ devmodeExtendIntervalDays: 7.5 })).toEqual([
        'devmodeExtendIntervalDays',
      ]);
    });
  });

  describe('localIp', () => {
    it.each(['192.168.1.50', '10.0.0.1', '::1'])('accepts %s', async (ip) => {
      expect(await errorsFor({ localIp: ip })).toEqual([]);
    });

    it.each(['not-an-ip', '999.1.1.1', 'http://192.168.1.50'])('rejects %s', async (ip) => {
      expect(await errorsFor({ localIp: ip })).toEqual(['localIp']);
    });

    it('accepts null to clear it', async () => {
      expect(await errorsFor({ localIp: null })).toEqual([]);
    });
  });

  describe('macAddress', () => {
    it.each(['AA:BB:CC:DD:EE:FF', 'aa-bb-cc-dd-ee-ff'])('accepts %s', async (mac) => {
      expect(await errorsFor({ macAddress: mac })).toEqual([]);
    });

    it.each(['AA:BB:CC:DD:EE', 'ZZ:BB:CC:DD:EE:FF', '192.168.1.50'])('rejects %s', async (mac) => {
      expect(await errorsFor({ macAddress: mac })).toEqual(['macAddress']);
    });

    it('accepts null to clear it', async () => {
      expect(await errorsFor({ macAddress: null })).toEqual([]);
    });
  });

  describe('ssapPort', () => {
    it.each([3000, 3001])('accepts %i', async (port) => {
      expect(await errorsFor({ ssapPort: port })).toEqual([]);
    });

    // SSAP only ever listens on those two; anything else is a typo that would
    // make every probe fail with no obvious cause.
    it.each([80, 3002, 9922])('rejects %i', async (port) => {
      expect(await errorsFor({ ssapPort: port })).toEqual(['ssapPort']);
    });
  });

  describe('agentId', () => {
    it('accepts a uuid', async () => {
      expect(await errorsFor({ agentId: '660e8400-e29b-41d4-a716-446655440000' })).toEqual([]);
    });

    // Detaching used to be a null here, which kept the address, the passphrase
    // and the onboarding progress. Taking a screen out is its own endpoint now,
    // so there is no half-removal to validate.
    it('rejects null, which used to mean "detach and keep everything"', async () => {
      expect(await errorsFor({ agentId: null as unknown as string })).toEqual(['agentId']);
    });

    it('rejects a non-uuid', async () => {
      expect(await errorsFor({ agentId: 'venue-north' })).toEqual(['agentId']);
    });
  });

  describe('wakeLeadTimeMinutes', () => {
    it.each([1, 10, 120])('accepts %i', async (minutes) => {
      expect(await errorsFor({ wakeLeadTimeMinutes: minutes })).toEqual([]);
    });

    it.each([0, 121])('rejects %i', async (minutes) => {
      expect(await errorsFor({ wakeLeadTimeMinutes: minutes })).toEqual(['wakeLeadTimeMinutes']);
    });
  });

  describe('devmodePassphrase', () => {
    it('accepts an empty string, which means "keep the stored value"', async () => {
      expect(await errorsFor({ devmodePassphrase: '' })).toEqual([]);
    });

    it('accepts null, which clears it', async () => {
      expect(await errorsFor({ devmodePassphrase: null })).toEqual([]);
    });

    it('rejects anything over 64 characters', async () => {
      expect(await errorsFor({ devmodePassphrase: 'a'.repeat(65) })).toEqual(['devmodePassphrase']);
    });
  });
});
