import { SetMetadata } from '@nestjs/common';

export const ALLOW_WITHOUT_MFA_KEY = 'allowWithoutMfa';

/**
 * Marks a route a session without a confirmed second factor may still reach
 * when MFA is mandatory for its user (super-admin, or member of any org with
 * `requireMfa`): the shell's own identity calls, logout and the MFA enrolment
 * endpoints themselves. Everything else answers `403 MFA_ENROLMENT_REQUIRED`,
 * which is what sends the SPA into the enrolment wizard.
 *
 * Keep this list short — every route marked here is reachable with a password
 * alone.
 */
export const AllowWithoutMfa = () => SetMetadata(ALLOW_WITHOUT_MFA_KEY, true);
