import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { UserService } from '../user/user.service';

const ONE_HOUR_MS = 60 * 60 * 1000;
const DEFAULT_UNVERIFIED_TTL_HOURS = 24;

/**
 * Periodically removes never-verified self-signups (and the orphan organisation
 * each one created) once they are older than SIGNUP_UNVERIFIED_TTL_HOURS, so an
 * abandoned registration cannot squat an email or organisation name forever.
 */
@Injectable()
export class UnverifiedSignupCleanupService {
  private readonly logger = new Logger(UnverifiedSignupCleanupService.name);

  constructor(
    private readonly users: UserService,
    private readonly config: ConfigService,
  ) {}

  @Interval(ONE_HOUR_MS)
  async cleanup(): Promise<void> {
    const ttlHours = this.config.get<number>(
      'SIGNUP_UNVERIFIED_TTL_HOURS',
      DEFAULT_UNVERIFIED_TTL_HOURS,
    );
    const cutoff = new Date(Date.now() - ttlHours * ONE_HOUR_MS);
    try {
      const removed = await this.users.deleteStaleUnverifiedSignups(cutoff);
      if (removed > 0) {
        this.logger.log(`Removed ${removed} never-verified signup(s) older than ${ttlHours}h`);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Unverified-signup cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
