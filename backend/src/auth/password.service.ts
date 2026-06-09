import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

/**
 * Password hashing/verification using bcrypt (cost 12). bcrypt is already a
 * backend dependency (screen API-key auth), avoiding a second native addon that
 * could break the rootless-Podman/musl image.
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  }

  /**
   * Verify a plaintext password against a stored hash. Returns false (never
   * throws) for a null/empty hash (invitee with no password yet) or any bcrypt
   * error, so callers can treat it as a simple boolean gate.
   */
  async verify(hash: string | null | undefined, plain: string): Promise<boolean> {
    if (!hash) {
      return false;
    }
    try {
      return await bcrypt.compare(plain, hash);
    } catch (error: unknown) {
      this.logger.warn(
        `Password verification error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
