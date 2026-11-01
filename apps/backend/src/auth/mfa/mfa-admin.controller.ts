import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../jwt-auth.guard';
import { OrgFromParam } from '../org-from-param.decorator';
import { Roles } from '../roles.decorator';
import { SuperAdminGuard } from '../super-admin.guard';
import { OrganisationRole } from '../../user/organisation-role.enum';
import { OrgMfaRequirementDto } from './dto';
import { MfaAdminService, type OrgMfaRequirementView } from './mfa-admin.service';

/** `DELETE /api/admin/users/:id/mfa` — super-admin reset of anyone but oneself. */
@Controller('admin/users')
@UseGuards(SuperAdminGuard)
export class MfaSuperAdminController {
  constructor(private readonly mfaAdmin: MfaAdminService) {}

  @Delete(':id/mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  reset(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest): Promise<void> {
    return this.mfaAdmin.resetBySuperAdmin(id, req.user);
  }
}

/**
 * Org-admin MFA administration: the org's `requireMfa` switch and the reset of
 * a member's factor. Lives next to the MFA service rather than in the
 * organisation module, which the super-admin-only `PATCH /organisations/:id`
 * guards as a whole.
 */
@Controller('organisations/:orgId')
@OrgFromParam('orgId')
@Roles(OrganisationRole.OrgAdmin)
export class OrgMfaController {
  constructor(private readonly mfaAdmin: MfaAdminService) {}

  @Get('mfa-requirement')
  getRequirement(@Param('orgId', ParseUUIDPipe) orgId: string): Promise<OrgMfaRequirementView> {
    return this.mfaAdmin.getOrgRequirement(orgId);
  }

  @Patch('mfa-requirement')
  setRequirement(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: OrgMfaRequirementDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrgMfaRequirementView> {
    return this.mfaAdmin.setOrgRequirement(orgId, dto.requireMfa, req.user);
  }

  @Delete('members/:userId/mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.mfaAdmin.resetByOrgAdmin(orgId, userId, req.user);
  }
}
