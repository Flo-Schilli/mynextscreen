import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { users } from '../db/schema';
import { PasswordService } from './password.service';

/**
 * Seeds system-level super-admins from `SUPER_ADMIN_EMAILS` (comma-separated) on
 * boot. For each email: create the user with `isSuperAdmin=true` (hashing
 * `SUPER_ADMIN_INITIAL_PASSWORD` if provided, else a null hash — set later via
 * the set-password flow); promote an existing user if already present.
 * Idempotent — safe to run on every boot.
 */
@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const emails = this.parseEmails(this.config.get<string>('SUPER_ADMIN_EMAILS', ''));
    if (emails.length === 0) {
      this.logger.log('No SUPER_ADMIN_EMAILS configured; skipping super-admin seed');
      return;
    }
    const initialPassword = this.config.get<string>('SUPER_ADMIN_INITIAL_PASSWORD');
    const passwordHash = initialPassword ? await this.passwords.hash(initialPassword) : null;

    for (const email of emails) {
      await this.seedOne(email, passwordHash);
    }
  }

  private async seedOne(email: string, passwordHash: string | null): Promise<void> {
    const [existing] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing) {
      if (!existing.isSuperAdmin) {
        await this.db.update(users).set({ isSuperAdmin: true }).where(eq(users.id, existing.id));
        this.logger.log(`Promoted existing user to super-admin: ${email}`);
      }
      return;
    }

    await this.db.insert(users).values({ email, name: null, isSuperAdmin: true, passwordHash });
    this.logger.log(
      passwordHash
        ? `Seeded super-admin with initial password: ${email}`
        : `Seeded super-admin without password (use forgot-password to activate): ${email}`,
    );
  }

  private parseEmails(raw: string): string[] {
    return raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
}
