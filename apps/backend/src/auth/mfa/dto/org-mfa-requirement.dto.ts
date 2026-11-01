import { IsBoolean } from 'class-validator';

/** `PATCH /api/organisations/:orgId/mfa-requirement` */
export class OrgMfaRequirementDto {
  @IsBoolean()
  requireMfa!: boolean;
}
