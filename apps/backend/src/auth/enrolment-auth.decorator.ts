import { SetMetadata } from '@nestjs/common';

/**
 * Marks the one route that still accepts a screen's API key. Everywhere else a
 * screen authenticates with a short-lived session token or a signed media URL,
 * so the key is used exactly once per enrolment instead of on every request.
 */
export const IS_ENROLMENT_AUTH_KEY = 'isEnrolmentAuth';
export const EnrolmentAuth = () => SetMetadata(IS_ENROLMENT_AUTH_KEY, true);
