export interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organisationId: string;
  role: OrganisationRole;
  createdAt: string;
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
