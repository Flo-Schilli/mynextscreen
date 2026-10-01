import { SetupPinService } from './setup-pin.service';

describe('SetupPinService', () => {
  describe('generated PIN', () => {
    it('matches only itself', () => {
      const service = new SetupPinService(null);
      const logger = jest.spyOn(service['logger'], 'log').mockImplementation();
      service.announce('http://192.168.1.20:8787');
      const pin = logger.mock.calls.map(([line]) => String(line)).find((l) => l.includes('PIN'));
      const value = pin?.replace('Setup PIN: ', '') ?? '';

      expect(service.matches(value)).toBe(true);
      expect(service.matches('0000-0000')).toBe(false);
    });

    it('is eight digits in two groups', () => {
      const service = new SetupPinService(null);
      const logger = jest.spyOn(service['logger'], 'log').mockImplementation();
      service.announce('http://x');
      const pin =
        logger.mock.calls
          .map(([l]) => String(l))
          .find((l) => l.includes('PIN'))
          ?.replace('Setup PIN: ', '') ?? '';

      expect(pin).toMatch(/^\d{4}-\d{4}$/);
    });

    // Losing the PIN is recovered by restarting the container, which is also
    // why it is never persisted.
    it('differs between instances', () => {
      const a = new SetupPinService(null);
      const b = new SetupPinService(null);

      expect(a.matches(b['pin'])).toBe(false);
    });
  });

  describe('configured PIN', () => {
    it('is used instead of a generated one', () => {
      const service = new SetupPinService('my-fixed-pin');

      expect(service.matches('my-fixed-pin')).toBe(true);
    });

    // Otherwise someone setting MNS_SETUP_PIN="" would get a PIN of "", which
    // every request satisfies.
    it('falls back to a generated one when set to empty', () => {
      const service = new SetupPinService('');

      expect(service.matches('')).toBe(false);
    });

    it('is not written to the log', () => {
      const service = new SetupPinService('my-fixed-pin');
      const logger = jest.spyOn(service['logger'], 'log').mockImplementation();

      service.announce('http://x');

      expect(logger.mock.calls.flat().join(' ')).not.toContain('my-fixed-pin');
    });
  });

  describe('matches', () => {
    const service = new SetupPinService('1234-5678');

    it.each([undefined, '', '1234', '1234-5678-9'])('rejects %p', (candidate) => {
      expect(service.matches(candidate as string | undefined)).toBe(false);
    });
  });
});
