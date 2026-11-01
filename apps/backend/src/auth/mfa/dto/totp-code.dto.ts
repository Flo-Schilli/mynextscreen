import { Matches } from 'class-validator';
import { TOTP_CODE_MESSAGE, TOTP_CODE_PATTERN } from './mfa-dto.patterns';

/** Body of `totp/confirm`. */
export class TotpCodeDto {
  @Matches(TOTP_CODE_PATTERN, { message: TOTP_CODE_MESSAGE })
  code!: string;
}
