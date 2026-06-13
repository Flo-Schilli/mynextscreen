import { createHash } from 'node:crypto';
import { buildGravatarUrl } from './gravatar.util';

describe('buildGravatarUrl', () => {
  const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

  it('hashes the trimmed, lowercased email with SHA-256', () => {
    const url = buildGravatarUrl('Test@Example.com');

    expect(url).toContain(`/avatar/${sha256('test@example.com')}?`);
  });

  it('trims surrounding whitespace before hashing', () => {
    const padded = buildGravatarUrl('  user@example.com  ');
    const clean = buildGravatarUrl('user@example.com');

    expect(padded).toBe(clean);
  });

  it('requests the identicon default image and a sized avatar', () => {
    const url = buildGravatarUrl('user@example.com');

    expect(url).toContain('d=identicon');
    expect(url).toContain('s=160');
  });

  it('produces a Gravatar https URL', () => {
    expect(buildGravatarUrl('user@example.com')).toMatch(
      /^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{64}\?/,
    );
  });
});
