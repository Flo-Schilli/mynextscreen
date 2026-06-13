export interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Invite lifecycle status derived server-side:
 * - `pending`: invited but not yet activated (no password set).
 * - `active`:  has signed up / set a password and can log in.
 */
export type MemberStatus = 'pending' | 'active';

export interface Membership {
  id: string;
  userId: string;
  organisationId: string;
  role: OrganisationRole;
  createdAt: string;
  status: MemberStatus;
  user: MemberUser;
}

export interface MyMembership {
  id: string;
  userId: string;
  organisationId: string;
  role: OrganisationRole;
  createdAt: string;
  organisation?: { id: string; name: string };
}

export type OrganisationRole = 'org_admin' | 'editor' | 'viewer';

export interface AddMemberRequest {
  email: string;
  role: OrganisationRole;
}

export interface UpdateMemberRoleRequest {
  role: OrganisationRole;
}
