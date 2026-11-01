import { TotpService } from './totp.service';

/** RFC 6238 Appendix B seed for SHA-1: ASCII "12345678901234567890". */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

function at(epochSeconds: number): TotpService {
  return new TotpService(() => epochSeconds * 1000);
}

describe('TotpService', () => {
  describe('RFC 6238 test vectors (SHA-1, last 6 of the 8-digit values)', () => {
    it.each([
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
      [20000000000, '353130'],
    ])('at T=%i the code is %s', (time, code) => {
      const service = at(time);
      expect(service.generate(RFC_SECRET)).toBe(code);
      expect(service.validate(RFC_SECRET, code)).toBe(Math.floor(time / 30));
    });
  });

  describe('validation window', () => {
    const time = 1111111109; // step 37037036
    const step = Math.floor(time / 30);

    it('accepts the previous and the next step (±30 s) and reports that step', () => {
      const previous = at(time - 30).generate(RFC_SECRET);
      const next = at(time + 30).generate(RFC_SECRET);
      expect(at(time).validate(RFC_SECRET, previous)).toBe(step - 1);
      expect(at(time).validate(RFC_SECRET, next)).toBe(step + 1);
    });

    it('rejects codes outside the window', () => {
      const tooOld = at(time - 60).generate(RFC_SECRET);
      const tooNew = at(time + 60).generate(RFC_SECRET);
      expect(at(time).validate(RFC_SECRET, tooOld)).toBeNull();
      expect(at(time).validate(RFC_SECRET, tooNew)).toBeNull();
    });

    it('rejects a wrong code', () => {
      expect(at(time).validate(RFC_SECRET, '000000')).toBeNull();
    });
  });

  describe('secrets and URIs', () => {
    const service = new TotpService();

    it('generates distinct 160-bit Base32 secrets', () => {
      const a = service.generateSecret();
      const b = service.generateSecret();
      expect(a).toMatch(/^[A-Z2-7]{32}$/);
      expect(a).not.toBe(b);
    });

    it('builds an otpauth URI with issuer, label and the standard parameters', () => {
      const uri = new URL(service.buildUri(RFC_SECRET, 'admin@example.com'));
      expect(uri.protocol).toBe('otpauth:');
      expect(uri.host).toBe('totp');
      expect(decodeURIComponent(uri.pathname)).toBe('/myNextScreen:admin@example.com');
      expect(uri.searchParams.get('issuer')).toBe('myNextScreen');
      expect(uri.searchParams.get('secret')).toBe(RFC_SECRET);
      expect(uri.searchParams.get('algorithm')).toBe('SHA1');
      expect(uri.searchParams.get('digits')).toBe('6');
      expect(uri.searchParams.get('period')).toBe('30');
    });

    it('renders the URI as a PNG data URL', async () => {
      const dataUrl = await service.toQrDataUrl(service.buildUri(RFC_SECRET, 'a@example.com'));
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('uses the real clock by default', () => {
      const code = service.generate(RFC_SECRET);
      expect(service.validate(RFC_SECRET, code)).toBe(Math.floor(Date.now() / 30_000));
    });
  });
});
