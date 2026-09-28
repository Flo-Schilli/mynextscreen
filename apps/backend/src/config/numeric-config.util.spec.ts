import type { ConfigService } from '@nestjs/config';
import { getNumberConfig } from './numeric-config.util';

function configWith(value: unknown): ConfigService {
  return { get: () => value } as unknown as ConfigService;
}

describe('getNumberConfig', () => {
  it('parses a string, because that is what the environment always holds', () => {
    // The regression this exists for: multer rejects a string fileSize and the
    // whole app failed to boot.
    expect(getNumberConfig(configWith('104857600'), 'MAX_FILE_SIZE_BYTES', 1)).toBe(104857600);
  });

  it('passes a number through', () => {
    expect(getNumberConfig(configWith(42), 'X', 1)).toBe(42);
  });

  it.each([undefined, null, ''])('falls back for %p', (value) => {
    expect(getNumberConfig(configWith(value), 'X', 7)).toBe(7);
  });

  it('throws on a value that is not a number instead of yielding NaN', () => {
    expect(() => getNumberConfig(configWith('plenty'), 'X', 1)).toThrow(/must be a number/);
  });
});
