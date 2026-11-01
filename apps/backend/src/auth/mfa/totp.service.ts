import { Inject, Injectable, Optional } from '@nestjs/common';
import { Secret, TOTP } from 'otpauth';
import { toDataURL } from 'qrcode';

/** Injection token for the clock (epoch milliseconds); tests pin it. */
export const TOTP_CLOCK = Symbol('TOTP_CLOCK');
export type TotpClock = () => number;

const ISSUER = 'myNextScreen';
/** RFC 6238 defaults every authenticator app supports. */
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD_SECONDS = 30;
/** Accept the previous and next step too (±30 s clock drift). */
const WINDOW = 1;
/** 160-bit secret, the RFC 4226 recommendation for SHA-1. */
const SECRET_BYTES = 20;

/**
 * TOTP primitives (RFC 6238) on top of `otpauth`: generate a secret, build the
 * `otpauth://` URI and its QR code, and check a code. Validation returns the
 * time step the code belongs to, so the caller can refuse a step that was
 * already used (replay protection) — this service holds no state itself.
 */
@Injectable()
export class TotpService {
  private readonly now: TotpClock;

  constructor(@Optional() @Inject(TOTP_CLOCK) clock?: TotpClock) {
    this.now = clock ?? Date.now;
  }

  /** A fresh random secret, Base32-encoded (what authenticator apps expect). */
  generateSecret(): string {
    return new Secret({ size: SECRET_BYTES }).base32;
  }

  /** `otpauth://totp/myNextScreen:<label>?secret=…&issuer=myNextScreen…` */
  buildUri(secretBase32: string, label: string): string {
    return this.totp(secretBase32, label).toString();
  }

  /** The URI rendered as a PNG data URL, server-side (no third-party QR service). */
  async toQrDataUrl(uri: string): Promise<string> {
    return toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
  }

  /**
   * The time step `code` is valid for (within ±{@link WINDOW}), or null when it
   * is not a valid code right now.
   */
  validate(secretBase32: string, code: string): number | null {
    const timestamp = this.now();
    const delta = this.totp(secretBase32).validate({ token: code, timestamp, window: WINDOW });
    if (delta === null) {
      return null;
    }
    return this.currentStep(timestamp) + delta;
  }

  /** The code for the current step (tests and diagnostics only). */
  generate(secretBase32: string): string {
    return this.totp(secretBase32).generate({ timestamp: this.now() });
  }

  private currentStep(timestamp: number): number {
    return Math.floor(timestamp / 1000 / PERIOD_SECONDS);
  }

  private totp(secretBase32: string, label = ''): TOTP {
    return new TOTP({
      issuer: ISSUER,
      label,
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD_SECONDS,
      secret: Secret.fromBase32(secretBase32),
    });
  }
}
