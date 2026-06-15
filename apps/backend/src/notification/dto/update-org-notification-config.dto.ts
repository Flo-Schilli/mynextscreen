import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

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
  smtpHost?: string | null;

  @IsOptional()
  @IsInt()
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
  ntfyUrl?: string | null;

  @IsOptional()
  @IsString()
  ntfyTopic?: string | null;

  @IsOptional()
  @IsString()
  ntfyToken?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlertRulesDto)
  alertRules?: AlertRulesDto;
}
