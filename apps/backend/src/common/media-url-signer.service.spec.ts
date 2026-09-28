import type { ConfigService } from '@nestjs/config';
import { MediaUrlSigner } from './media-url-signer.service';

const SECRET = 'a'.repeat(48);
const SCREEN = '11111111-1111-1111-1111-111111111111';
const OTHER_SCREEN = '22222222-2222-2222-2222-222222222222';
const PATH = '/api/media/org-1/content-1';

function makeSigner(secret = SECRET): MediaUrlSigner {
  return new MediaUrlSigner({ getOrThrow: () => secret } as unknown as ConfigService);
}

/** Pulls the `sig` value out of a signed URL. */
function signatureOf(url: string): string {
  return new URLSearchParams(url.slice(url.indexOf('?') + 1)).get('sig') ?? '';
}

describe('MediaUrlSigner', () => {
  const signer = makeSigner();

  it('appends the screen id and a signature that verifies', () => {
    const url = signer.sign(SCREEN, PATH);

    expect(url.startsWith(`${PATH}?s=${SCREEN}&sig=`)).toBe(true);
    expect(signer.verify(SCREEN, PATH, signatureOf(url))).toBe(true);
  });

  it('never puts a credential in the URL', () => {
    expect(signer.sign(SCREEN, PATH)).not.toContain('token');
  });

  describe('rejection', () => {
    it('rejects a signature issued for another screen', () => {
      const url = signer.sign(OTHER_SCREEN, PATH);

      expect(signer.verify(SCREEN, PATH, signatureOf(url))).toBe(false);
    });

    it('rejects a signature issued for another path', () => {
      const url = signer.sign(SCREEN, '/api/media/org-1/other-content');

      expect(signer.verify(SCREEN, PATH, signatureOf(url))).toBe(false);
    });

    it('rejects a signature made with a different secret', () => {
      const url = makeSigner('b'.repeat(48)).sign(SCREEN, PATH);

      expect(signer.verify(SCREEN, PATH, signatureOf(url))).toBe(false);
    });

    it.each(['', 'not-a-signature', 'AAAA'])('rejects the garbage signature %p', (signature) => {
      expect(signer.verify(SCREEN, PATH, signature)).toBe(false);
    });
  });

  describe('bucketing', () => {
    it('is byte-stable across a day, so the HTTP cache keeps working', () => {
      const first = signer.sign(SCREEN, PATH, new Date('2026-05-01T00:00:00Z'));
      const later = signer.sign(SCREEN, PATH, new Date('2026-05-01T23:00:00Z'));

      // Not asserted as strictly equal for arbitrary pairs — the boundary sits
      // somewhere inside the day — but a one-hour gap must never change it.
      const stableWindowStart = new Date('2026-05-01T06:00:00Z');
      expect(signer.sign(SCREEN, PATH, stableWindowStart)).toBe(
        signer.sign(SCREEN, PATH, new Date(stableWindowStart.getTime() + 60 * 60 * 1000)),
      );
      expect(first).toBeTruthy();
      expect(later).toBeTruthy();
    });

    it('still verifies 24 hours later (previous bucket accepted)', () => {
      const issuedAt = new Date('2026-05-01T12:00:00Z');
      const signature = signatureOf(signer.sign(SCREEN, PATH, issuedAt));

      const oneDayLater = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000);
      expect(signer.verify(SCREEN, PATH, signature, oneDayLater)).toBe(true);
    });

    it('expires after 48 hours', () => {
      const issuedAt = new Date('2026-05-01T12:00:00Z');
      const signature = signatureOf(signer.sign(SCREEN, PATH, issuedAt));

      const twoDaysLater = new Date(issuedAt.getTime() + 48 * 60 * 60 * 1000 + 1000);
      expect(signer.verify(SCREEN, PATH, signature, twoDaysLater)).toBe(false);
    });

    it('does not roll over the whole fleet at the same instant', () => {
      // Two screens must not share a boundary, otherwise every URL in the
      // installation expires in the same second.
      const boundaryFor = (screenId: string): number => {
        let previous = signer.sign(screenId, PATH, new Date(0));
        for (let hour = 1; hour <= 24; hour += 1) {
          const at = new Date(hour * 60 * 60 * 1000);
          const current = signer.sign(screenId, PATH, at);
          if (current !== previous) {
            return hour;
          }
          previous = current;
        }
        return -1;
      };

      expect(boundaryFor(SCREEN)).not.toBe(boundaryFor(OTHER_SCREEN));
    });
  });
});
