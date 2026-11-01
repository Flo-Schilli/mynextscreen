import type { MfaRequiredBy } from '@mynextscreen/shared-types';

/**
 * Suffix of the translation key that explains why MFA is mandatory. Each
 * screen prepends its own prefix (`auth.mfa.page.reason…`,
 * `settings.user.security.required…`).
 */
export type MfaRequirementVariant =
  | 'SuperAdmin'
  | 'Organisations'
  | 'OrganisationsUnnamed'
  | 'SuperAdminAndOrganisations'
  | 'SuperAdminAndOrganisationsUnnamed';

export interface MfaRequirementText {
  variant: MfaRequirementVariant;
  params: Record<string, string | number>;
}

interface NamedOrganisation {
  id: string;
  name: string;
}

/** True when `requiredBy` makes MFA mandatory for the user. */
export function isMfaMandatory(requiredBy: MfaRequiredBy | null | undefined): boolean {
  return !!requiredBy && (requiredBy.superAdmin || requiredBy.organisationIds.length > 0);
}

/**
 * Describes why MFA is mandatory, or null while it is optional. Organisation
 * names come from the user's memberships; when any id cannot be resolved (for
 * example while the memberships are not loaded) the text falls back to a count
 * instead of a partial, misleading list.
 */
export function describeMfaRequirement(
  requiredBy: MfaRequiredBy | null | undefined,
  organisations: readonly NamedOrganisation[],
): MfaRequirementText | null {
  if (!requiredBy || !isMfaMandatory(requiredBy)) {
    return null;
  }
  const ids = [...new Set(requiredBy.organisationIds)];
  if (ids.length === 0) {
    return { variant: 'SuperAdmin', params: {} };
  }
  const names = ids.map((id) => organisations.find((org) => org.id === id)?.name);
  const prefix = requiredBy.superAdmin ? 'SuperAdminAndOrganisations' : 'Organisations';
  if (names.every((name): name is string => name !== undefined)) {
    return { variant: prefix, params: { names: names.join(', ') } };
  }
  return { variant: `${prefix}Unnamed`, params: { count: ids.length } };
}
