import { formatRole } from './format-role';

describe('formatRole', () => {
  it('maps known role keys to display labels', () => {
    expect(formatRole('org_admin')).toBe('Admin');
    expect(formatRole('editor')).toBe('Editor');
    expect(formatRole('viewer')).toBe('Viewer');
  });

  it('returns the raw role for unknown role keys', () => {
    expect(formatRole('super_admin')).toBe('super_admin');
  });
});
