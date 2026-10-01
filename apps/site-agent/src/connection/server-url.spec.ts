import { normaliseBaseUrl } from './server-url';

describe('normaliseBaseUrl', () => {
  // A trailing slash would produce `//api/...`, which some proxies reject
  // outright — and an operator pasting a URL very often leaves one on.
  it.each([
    ['https://a.example.com/', 'https://a.example.com'],
    ['https://a.example.com///', 'https://a.example.com'],
    ['https://a.example.com', 'https://a.example.com'],
    ['https://a.example.com/signage/', 'https://a.example.com/signage'],
  ])('trims %s', (input, expected) => {
    expect(normaliseBaseUrl(input)).toBe(expected);
  });

  // The value comes from the setup page and from the persisted state file,
  // neither of which is trusted once the machine is out of our hands.
  it.each(['file:///etc/passwd', 'data:text/plain,x', 'ftp://a.example.com'])(
    'refuses %s',
    (input) => {
      expect(() => normaliseBaseUrl(input)).toThrow(/must be http or https/);
    },
  );

  it('refuses something that is not a URL at all', () => {
    expect(() => normaliseBaseUrl('signage.example.com')).toThrow(/Not a valid server address/);
  });

  // Otherwise they would be sent on every single request for the life of the
  // agent, and would sit in the state file in the clear.
  it('drops embedded credentials', () => {
    expect(normaliseBaseUrl('https://user:secret@a.example.com')).toBe('https://a.example.com');
  });

  it('drops a query string and fragment', () => {
    expect(normaliseBaseUrl('https://a.example.com/?a=1#b')).toBe('https://a.example.com');
  });

  // The pattern this replaced was quadratic; a long run of slashes is the
  // input that showed it.
  it('handles a pathological run of slashes quickly', () => {
    const started = Date.now();

    expect(normaliseBaseUrl(`https://a.example.com${'/'.repeat(50_000)}`)).toBe(
      'https://a.example.com',
    );

    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
