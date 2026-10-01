/**
 * Normalises the server address and refuses anything that is not a plain
 * http(s) origin.
 *
 * Three things at once. Trailing slashes would produce `//api/...`, which some
 * proxies reject. Any other scheme — `file:`, `data:` — must not reach `fetch`,
 * because this value comes from the setup page and from the persisted state
 * file, neither of which is a trusted source once the machine is out of our
 * hands. And embedded credentials are dropped rather than silently sent on
 * every request for the life of the agent.
 *
 * In its own module so both the HTTP client and the store that persists the
 * address can use it without the store having to import the client.
 */
export function normaliseBaseUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Not a valid server address: ${url}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Server address must be http or https, not ${parsed.protocol}`);
  }

  parsed.username = '';
  parsed.password = '';
  parsed.search = '';
  parsed.hash = '';

  // `new URL('https://x')` normalises the pathname to '/', and a pasted address
  // may end in several. Trimmed with a loop rather than `/\/+$/`, which is the
  // quadratic pattern this was flagged for.
  let path = parsed.pathname;
  while (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return `${parsed.origin}${path}`;
}
