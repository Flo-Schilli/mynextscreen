import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AuditAction } from './audit-action.enum';

export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

export class AdminAuditLogQueryDto extends AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  organisationId?: string;
}
