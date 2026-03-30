import { validate } from 'class-validator';
import { Organisation } from './organisation.entity';

function createOrganisation(
  overrides: Partial<Organisation> = {},
): Organisation {
  const org = new Organisation();
  org.name = 'Test Org';
  org.timeZone = 'Europe/Vienna';
  org.storageOriginalLimitBytes = 1073741824;
  org.storageTranscodedLimitBytes = 2147483648;
  org.storageOriginalUsedBytes = 0;
  org.storageTranscodedUsedBytes = 0;
  org.defaultPlaylistId = null;
  Object.assign(org, overrides);
  return org;
}

describe('Organisation entity validation', () => {
  it('should pass validation with valid data', async () => {
    const org = createOrganisation();
    const errors = await validate(org);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is empty', async () => {
    const org = createOrganisation({ name: '' });
    const errors = await validate(org);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when timeZone is empty', async () => {
    const org = createOrganisation({ timeZone: '' });
    const errors = await validate(org);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'timeZone')).toBe(true);
  });

  it('should pass validation when defaultPlaylistId is null', async () => {
    const org = createOrganisation({ defaultPlaylistId: null });
    const errors = await validate(org);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when defaultPlaylistId is a valid UUID', async () => {
    const org = createOrganisation({
      defaultPlaylistId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    const errors = await validate(org);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when defaultPlaylistId is not a valid UUID', async () => {
    const org = createOrganisation({
      defaultPlaylistId: 'not-a-uuid',
    });
    const errors = await validate(org);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'defaultPlaylistId')).toBe(true);
  });
});
