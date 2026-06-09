import { IANA_TIME_ZONES } from './timezones';

describe('IANA_TIME_ZONES', () => {
  it('is a non-empty array of strings', () => {
    // Arrange & Act & Assert
    expect(Array.isArray(IANA_TIME_ZONES)).toBe(true);
    expect(IANA_TIME_ZONES.length).toBeGreaterThan(0);
    expect(IANA_TIME_ZONES.every((tz) => typeof tz === 'string')).toBe(true);
  });

  it('contains well-known canonical zones including UTC', () => {
    // Arrange & Act & Assert
    expect(IANA_TIME_ZONES).toContain('UTC');
    expect(IANA_TIME_ZONES).toContain('Europe/Vienna');
    expect(IANA_TIME_ZONES).toContain('America/New_York');
    expect(IANA_TIME_ZONES).toContain('Asia/Tokyo');
  });

  it('uses the Region/City IANA shape for non-UTC entries', () => {
    // Arrange
    const nonUtc = IANA_TIME_ZONES.filter((tz) => tz !== 'UTC');

    // Act & Assert
    expect(nonUtc.every((tz) => tz.includes('/'))).toBe(true);
  });

  it('has no duplicate entries', () => {
    // Arrange & Act
    const unique = new Set(IANA_TIME_ZONES);

    // Assert
    expect(unique.size).toBe(IANA_TIME_ZONES.length);
  });

  it('is resolvable by Intl.DateTimeFormat (valid IANA identifiers)', () => {
    // Arrange & Act & Assert
    for (const tz of IANA_TIME_ZONES) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: tz })).not.toThrow();
    }
  });
});
