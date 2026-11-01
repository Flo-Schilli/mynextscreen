import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MANAGEMENT_CODE_MESSAGE, MANAGEMENT_CODE_PATTERN } from './mfa-dto.patterns';

export class TotpDisableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  @Matches(MANAGEMENT_CODE_PATTERN, { message: MANAGEMENT_CODE_MESSAGE })
  code!: string;
}
