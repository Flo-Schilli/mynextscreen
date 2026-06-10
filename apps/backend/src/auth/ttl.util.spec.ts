import { parseTtlToSeconds } from './ttl.util';

describe('parseTtlToSeconds', () => {
  it.each([
    ['90s', 90],
    ['15m', 900],
    ['1h', 3600],
    ['30d', 2_592_000],
  ])('parses %s to %d seconds', (input, expected) => {
    expect(parseTtlToSeconds(input)).toBe(expected);
  });

  it('trims surrounding whitespace', () => {
    expect(parseTtlToSeconds('  5m  ')).toBe(300);
  });

  it('throws on an invalid format', () => {
    expect(() => parseTtlToSeconds('5 minutes')).toThrow();
    expect(() => parseTtlToSeconds('abc')).toThrow();
    expect(() => parseTtlToSeconds('10')).toThrow();
  });

  it('throws on an unsupported unit', () => {
    expect(() => parseTtlToSeconds('5y')).toThrow();
  });
});
