import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

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
}
