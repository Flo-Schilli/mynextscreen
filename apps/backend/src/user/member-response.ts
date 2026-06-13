import type { User, UserOrganisationMembership } from '../db/schema';
import { OrganisationRole } from './organisation-role.enum';

type MembershipWithUser = UserOrganisationMembership & { user: User };

/**
 * Invite lifecycle status of an org member, derived server-side:
 * - `pending`: invited but not yet activated (no password set yet).
 * - `active`:  has set a password / signed up and can log in.
 */
export type MemberStatus = 'pending' | 'active';

/** Safe, API-facing view of an org member — never leaks password hashes or tokens. */
export interface MemberResponse {
  id: string;
  userId: string;
  organisationId: string;
  role: OrganisationRole;
  createdAt: Date;
  status: MemberStatus;
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Shape a membership for the API. An invitee provisioned by an admin has a
 * null password hash until they activate via the set-password link, so a
 * null hash is the canonical "invite still pending" signal. Sensitive fields
 * (passwordHash, reset/verification tokens) are intentionally dropped here.
 */
export function toMemberResponse(membership: MembershipWithUser): MemberResponse {
  const { user } = membership;
  return {
    id: membership.id,
    userId: membership.userId,
    organisationId: membership.organisationId,
    role: membership.role as OrganisationRole,
    createdAt: membership.createdAt,
    status: user.passwordHash === null ? 'pending' : 'active',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}
