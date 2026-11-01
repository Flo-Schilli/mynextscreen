import { describeMfaRequirement, isMfaMandatory } from './mfa-requirement';

const ORGS = [
  { id: 'o1', name: 'Club One' },
  { id: 'o2', name: 'Hall Two' },
];

describe('mfa-requirement', () => {
  it('treats super-admins and requiring organisations as mandatory', () => {
    expect(isMfaMandatory({ superAdmin: true, organisationIds: [] })).toBe(true);
    expect(isMfaMandatory({ superAdmin: false, organisationIds: ['o1'] })).toBe(true);
    expect(isMfaMandatory({ superAdmin: false, organisationIds: [] })).toBe(false);
    expect(isMfaMandatory(null)).toBe(false);
  });

  it('returns null while MFA is optional or the reason is unknown', () => {
    expect(describeMfaRequirement({ superAdmin: false, organisationIds: [] }, ORGS)).toBeNull();
    expect(describeMfaRequirement(null, ORGS)).toBeNull();
  });

  it('describes the super-admin case', () => {
    expect(describeMfaRequirement({ superAdmin: true, organisationIds: [] }, ORGS)).toEqual({
      variant: 'SuperAdmin',
      params: {},
    });
  });

  it('lists the organisation names when all are known (deduplicated)', () => {
    expect(
      describeMfaRequirement({ superAdmin: false, organisationIds: ['o1', 'o2', 'o1'] }, ORGS),
    ).toEqual({ variant: 'Organisations', params: { names: 'Club One, Hall Two' } });
  });

  it('combines super-admin and organisations', () => {
    expect(describeMfaRequirement({ superAdmin: true, organisationIds: ['o2'] }, ORGS)).toEqual({
      variant: 'SuperAdminAndOrganisations',
      params: { names: 'Hall Two' },
    });
  });

  it('falls back to a count when any name is unknown', () => {
    expect(
      describeMfaRequirement({ superAdmin: false, organisationIds: ['o1', 'x'] }, ORGS),
    ).toEqual({ variant: 'OrganisationsUnnamed', params: { count: 2 } });
    expect(describeMfaRequirement({ superAdmin: true, organisationIds: ['x'] }, [])).toEqual({
      variant: 'SuperAdminAndOrganisationsUnnamed',
      params: { count: 1 },
    });
  });
});
