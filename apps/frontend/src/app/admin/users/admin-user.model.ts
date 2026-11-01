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
  /** The user has a TOTP factor set up. */
  mfaEnabled: boolean;
  createdAt: string;
  memberships: AdminUserMembership[];
}
