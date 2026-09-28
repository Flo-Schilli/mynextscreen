import type { ConfigService } from '@nestjs/config';

/**
 * Reads a numeric setting from the environment.
 *
 * `ConfigService.get<number>()` does not convert anything — the generic only
 * describes the value, and an environment variable is always a string. Consumers
 * that merely compare the value get away with the implicit coercion; multer's
 * `limits.fileSize` does not and refuses to start ("Expected limits.fileSize to
 * be a non-negative integer"), which took the whole app down at boot.
 */
export function getNumberConfig(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string | number | undefined>(key);
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a number, got "${String(raw)}"`);
  }
  return parsed;
}
