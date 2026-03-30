import { validate } from 'class-validator';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
import { OrganisationRole } from './organisation-role.enum';

function createMembership(
  overrides: Partial<UserOrganisationMembership> = {},
): UserOrganisationMembership {
  const m = new UserOrganisationMembership();
  m.userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  m.organisationId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  m.role = OrganisationRole.Editor;
  Object.assign(m, overrides);
  return m;
}

describe('UserOrganisationMembership entity validation', () => {
  it('should pass validation with valid data', async () => {
    const m = createMembership();
    const errors = await validate(m);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation for each role value', async () => {
    for (const role of Object.values(OrganisationRole)) {
      const m = createMembership({ role });
      const errors = await validate(m);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail validation when role is invalid', async () => {
    const m = createMembership({ role: 'super_admin' as OrganisationRole });
    const errors = await validate(m);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('should fail validation when userId is empty', async () => {
    const m = createMembership({ userId: '' });
    const errors = await validate(m);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });

  it('should fail validation when organisationId is empty', async () => {
    const m = createMembership({ organisationId: '' });
    const errors = await validate(m);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should fail validation when userId is not a UUID', async () => {
    const m = createMembership({ userId: 'not-a-uuid' });
    const errors = await validate(m);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });

  it('should fail validation when organisationId is not a UUID', async () => {
    const m = createMembership({ organisationId: 'not-a-uuid' });
    const errors = await validate(m);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });
});
