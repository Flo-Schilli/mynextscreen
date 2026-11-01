import { IsDefined, Matches, ValidateIf } from 'class-validator';
import { RECOVERY_CODE_PATTERN } from '../recovery-code.service';
import { RECOVERY_CODE_MESSAGE, TOTP_CODE_MESSAGE, TOTP_CODE_PATTERN } from './mfa-dto.patterns';

/** Second login step: a TOTP code or, failing the device, a recovery code. */
export class LoginMfaDto {
  // Validated when given, and required when no recovery code is given.
  @ValidateIf((dto: LoginMfaDto) => dto.code !== undefined || dto.recoveryCode === undefined)
  @IsDefined({ message: 'code or recoveryCode is required' })
  @Matches(TOTP_CODE_PATTERN, { message: TOTP_CODE_MESSAGE })
  code?: string;

  @ValidateIf((dto: LoginMfaDto) => dto.recoveryCode !== undefined)
  @Matches(RECOVERY_CODE_PATTERN, { message: RECOVERY_CODE_MESSAGE })
  recoveryCode?: string;
}
