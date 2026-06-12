export interface AdminUserMembership {
  organisationId: string;
  organisationName: string;
  role: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships: AdminUserMembership[];
}
