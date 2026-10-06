import { SetMetadata } from '@nestjs/common';

export const IS_SETUP_PUBLIC_KEY = 'isSetupPublic';

/**
 * Marks a setup route as reachable without a setup code. Used for the responses
 * that carry no secret — the status view and the page itself — and for enrol,
 * whose own single-use token is the credential.
 */
export const SetupPublic = () => SetMetadata(IS_SETUP_PUBLIC_KEY, true);
