import 'reflect-metadata';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

const FIVE_GIB = 5 * 1024 * 1024 * 1024;

/**
 * Subset of process env that the self-signup + platform-mailer feature consumes,
 * validated once at bootstrap so a malformed value fails fast instead of
 * surfacing as a runtime 500 later. Only the NEW variables are declared here;
 * pre-existing secrets (DATABASE_URL, JWT_ACCESS_SECRET, …) keep their existing
 * `getOrThrow` call sites and pass through untouched (unknown props are retained
 * by plainToInstance, so ConfigService still sees them).
 *
 * All fields are optional with dev-friendly defaults (Mailpit) so the app boots
 * out of the box; production overrides them via ENV.
 */
export class EnvironmentVariables {
  // ── Platform mailer (account/system emails; per-org SMTP stays separate) ────

  /** SMTP host. Defaults to localhost / the Mailpit service in dev. */
  @IsString()
  @IsOptional()
  SMTP_HOST = 'localhost';

  /** SMTP port. Default 1025 = Mailpit dev port. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  SMTP_PORT = 1025;

  /** SMTP login (optional; auth is skipped when both user + password are empty). */
  @IsString()
  @IsOptional()
  SMTP_USER = '';

  @IsString()
  @IsOptional()
  SMTP_PASSWORD = '';

  /** From address for all outbound account mail. */
  @IsString()
  @IsOptional()
  SMTP_FROM = 'Signage Server <noreply@signage.local>';

  /**
   * Use TLS from the start (port 465). Set false for STARTTLS / plain
   * (587/1025). Parsed explicitly: only 'true'/'1' are truthy, so a stray
   * 'false' string does not coerce to true (class-transformer gotcha).
   */
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' || value === '1' : value))
  @IsBoolean()
  @IsOptional()
  SMTP_SECURE = false;

  /**
   * Public base URL of the admin SPA (no trailing slash). Used to build the
   * verify / set-password / confirm-email-change links inside emails.
   */
  @IsString()
  @IsOptional()
  PUBLIC_BASE_URL = 'http://localhost:4200';

  // ── Self-signup ─────────────────────────────────────────────────────────────

  /** Feature flag: when false, POST /api/auth/register is rejected (403). */
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' || value === '1' : value))
  @IsBoolean()
  @IsOptional()
  SIGNUP_ENABLED = true;

  /** Default original-media storage limit (bytes) for a self-created org. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES = FIVE_GIB;

  /** Default transcoded-media storage limit (bytes) for a self-created org. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  SIGNUP_DEFAULT_STORAGE_TRANSCODED_BYTES = FIVE_GIB;

  /**
   * How long a never-verified signup survives before the cleanup cron deletes
   * it (and its orphan org). Hours.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  SIGNUP_UNVERIFIED_TTL_HOURS = 48;
}

/**
 * ConfigModule `validate` hook. Coerces + validates the new env vars and throws
 * (fail-fast at bootstrap) on a malformed value. Unknown props are preserved so
 * the rest of the app's config is unaffected.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated as unknown as Record<string, unknown>;
}
