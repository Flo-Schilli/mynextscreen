import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Signs the media URLs a screen is told to load, so the URL itself carries the
 * grant and no credential has to travel in it.
 *
 * Until now these URLs carried the screen's long-lived API key as `?token=`,
 * because a browser cannot attach an Authorization header to `<img>`/`<video>`
 * src. That put a permanent credential into the DOM, the Referer chain and every
 * access log.
 *
 * The signature is deliberately **bucketed** rather than tied to an exact
 * timestamp. Media responses are cached with `max-age=86400`, and that only
 * works while the URL is byte-stable: a value that changes on every state push
 * would make every screen re-download its whole playlist each time. Within a
 * bucket the URL is therefore identical, and both the current and the previous
 * bucket verify — so a grant lives between 24 and 48 hours.
 *
 * The bucket boundary is offset per screen, so a fleet does not roll over in
 * lockstep.
 *
 * Only the **path** is signed. Unknown query parameters are ignored on purpose:
 * a player from before this change still appends `&token=…` to the URL it was
 * given, and must keep working during the rollout.
 */
const SIGNING_INFO = 'media-url-signing-v1';
const BUCKET_MS = 24 * 60 * 60 * 1000;

/** Query parameter names on a signed URL. Neither value is a secret. */
export const SIGNATURE_PARAM = 'sig';
export const SCREEN_PARAM = 's';

@Injectable()
export class MediaUrlSigner {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    // Derived, not reused: the JWT secret never signs media URLs directly.
    this.key = createHmac('sha256', config.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .update(SIGNING_INFO)
      .digest();
  }

  /** Appends the screen id and signature to a path. Returns `path?s=…&sig=…`. */
  sign(screenId: string, pathname: string, at: Date = new Date()): string {
    const signature = this.computeSignature(screenId, pathname, this.bucketFor(screenId, at));
    const separator = pathname.includes('?') ? '&' : '?';
    return `${pathname}${separator}${SCREEN_PARAM}=${encodeURIComponent(screenId)}&${SIGNATURE_PARAM}=${signature}`;
  }

  /**
   * True when the signature matches the current or the previous bucket. The
   * previous bucket is accepted so a URL handed out just before a rollover does
   * not die the moment the boundary passes.
   */
  verify(screenId: string, pathname: string, signature: string, at: Date = new Date()): boolean {
    const current = this.bucketFor(screenId, at);
    return (
      this.matches(screenId, pathname, signature, current) ||
      this.matches(screenId, pathname, signature, current - 1)
    );
  }

  private matches(screenId: string, pathname: string, signature: string, bucket: number): boolean {
    const expected = Buffer.from(this.computeSignature(screenId, pathname, bucket));
    const presented = Buffer.from(signature);
    if (expected.length !== presented.length) {
      return false;
    }
    return timingSafeEqual(expected, presented);
  }

  private computeSignature(screenId: string, pathname: string, bucket: number): string {
    return createHmac('sha256', this.key)
      .update(`${screenId}\n${pathname}\n${bucket}`)
      .digest('base64url');
  }

  /**
   * Bucket index for a screen. The per-screen offset spreads the rollovers of a
   * fleet across the day instead of expiring every URL at midnight UTC.
   */
  private bucketFor(screenId: string, at: Date): number {
    const offset = parseInt(createHash('sha256').update(screenId).digest('hex').slice(0, 8), 16);
    return Math.floor((at.getTime() + (offset % BUCKET_MS)) / BUCKET_MS);
  }
}
