import { TotpDisableDto } from './totp-disable.dto';

/** Body of `recovery-codes/regenerate`: current password + a valid TOTP code. */
export class RecoveryCodesRegenerateDto extends TotpDisableDto {}
