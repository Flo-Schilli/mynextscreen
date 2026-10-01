import { screenFilePath } from './screen-id.util';

describe('screenFilePath', () => {
  const dir = '/var/lib/mynextscreen-agent/keys';
  const screenId = '7f1c2f3e-9a4b-4c5d-8e6f-0a1b2c3d4e5f';

  it('builds a path inside the directory', () => {
    expect(screenFilePath(dir, screenId, '.pem')).toBe(`${dir}/${screenId}.pem`);
  });

  it('accepts an uppercase uuid', () => {
    expect(screenFilePath(dir, screenId.toUpperCase(), '.key')).toContain('.key');
  });

  // Screen ids arrive in the configuration the server sends. The server
  // generates UUIDs, but the agent holds a whole venue's credentials and writes
  // with its own privileges — so escaping the directory has to be impossible
  // here, not merely unlikely upstream.
  it.each([
    '../../etc/cron.d/evil',
    '..',
    '/etc/passwd',
    'screen-1',
    '',
    '7f1c2f3e-9a4b-4c5d-8e6f-0a1b2c3d4e5f/../../x',
  ])('refuses %p', (bad) => {
    expect(() => screenFilePath(dir, bad, '.pem')).toThrow(/not a screen id/);
  });
});
