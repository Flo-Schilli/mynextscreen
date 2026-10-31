import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TOTP_CODE_MESSAGE, TOTP_CODE_PATTERN } from './mfa-dto.patterns';

export class TotpSetupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  /** Required by the service only when TOTP is already active (device change). */
  @IsOptional()
  @Matches(TOTP_CODE_PATTERN, { message: TOTP_CODE_MESSAGE })
  code?: string;
}
