import { SetMetadata } from '@nestjs/common';

export const IS_SETUP_PUBLIC_KEY = 'isSetupPublic';

/**
 * Marks a setup route as readable without the PIN. Only for responses that
 * carry no secret — the status view, and the page itself.
 */
export const SetupPublic = () => SetMetadata(IS_SETUP_PUBLIC_KEY, true);
