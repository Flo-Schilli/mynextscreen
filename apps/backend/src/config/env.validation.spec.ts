import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults when nothing is set (dev-friendly)', () => {
    const result = validateEnv({});

    expect(result.SMTP_HOST).toBe('localhost');
    expect(result.SMTP_PORT).toBe(1025);
    expect(result.SMTP_SECURE).toBe(false);
    expect(result.SIGNUP_ENABLED).toBe(true);
    expect(result.SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES).toBe(5 * 1024 * 1024 * 1024);
    expect(result.SIGNUP_UNVERIFIED_TTL_HOURS).toBe(48);
  });

  it('coerces SMTP_PORT from string to int', () => {
    const result = validateEnv({ SMTP_PORT: '2525' });
    expect(result.SMTP_PORT).toBe(2525);
  });

  it('parses only "true"/"1" as truthy for boolean flags', () => {
    expect(validateEnv({ SMTP_SECURE: 'true' }).SMTP_SECURE).toBe(true);
    expect(validateEnv({ SMTP_SECURE: '1' }).SMTP_SECURE).toBe(true);
    expect(validateEnv({ SMTP_SECURE: 'false' }).SMTP_SECURE).toBe(false);
    expect(validateEnv({ SIGNUP_ENABLED: 'false' }).SIGNUP_ENABLED).toBe(false);
  });

  it('preserves unknown env vars untouched (subset validation)', () => {
    const result = validateEnv({ DATABASE_URL: 'postgres://x', JWT_ACCESS_SECRET: 'secret' });
    expect(result.DATABASE_URL).toBe('postgres://x');
    expect(result.JWT_ACCESS_SECRET).toBe('secret');
  });

  it('throws fast on an out-of-range SMTP_PORT', () => {
    expect(() => validateEnv({ SMTP_PORT: '70000' })).toThrow(/Invalid environment configuration/);
  });

  it('throws fast on a negative storage limit', () => {
    expect(() => validateEnv({ SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES: '-1' })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
