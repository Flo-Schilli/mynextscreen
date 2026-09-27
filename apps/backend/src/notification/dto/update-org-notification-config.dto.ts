import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsSafeOutboundHost, IsSafeOutboundUrl } from '../../common/outbound-url.validators';

/** Per-org alert-rule toggles (which events trigger a notification). */
export class AlertRulesDto {
  @IsBoolean()
  offline!: boolean;

  @IsBoolean()
  recovered!: boolean;

  @IsBoolean()
  transcodeFail!: boolean;

  @IsBoolean()
  storage!: boolean;

  @IsBoolean()
  weekly!: boolean;
}

export class UpdateOrgNotificationConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(253)
  @IsSafeOutboundHost()
  smtpHost?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number | null;

  @IsOptional()
  @IsString()
  smtpUser?: string | null;

  @IsOptional()
  @IsString()
  smtpPassword?: string | null;

  @IsOptional()
  @IsString()
  smtpFrom?: string | null;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsSafeOutboundUrl()
  ntfyUrl?: string | null;

  /**
   * Interpolated into the ntfy request path, so the charset is restricted to
   * what ntfy itself allows — a topic containing `/` or `..` would otherwise
   * let the caller pick an arbitrary path on the target host.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/, {
    message: 'ntfyTopic may only contain letters, digits, underscore and dash (max 64 characters)',
  })
  ntfyTopic?: string | null;

  @IsOptional()
  @IsString()
  ntfyToken?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlertRulesDto)
  alertRules?: AlertRulesDto;
}
