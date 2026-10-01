import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SiteAgentService, type SiteAgentListItem } from './site-agent.service';
import { CreateSiteAgentDto, UpdateSiteAgentDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { SiteAgent } from '../db/schema';

/** What the dashboard gets back when a token is issued. Shown exactly once. */
interface EnrolmentTokenResponse {
  enrolmentToken: string;
  expiresAt: Date;
}

interface CreatedSiteAgentResponse extends EnrolmentTokenResponse {
  agent: SiteAgent;
}

@Controller('site-agents')
export class SiteAgentController {
  constructor(private readonly siteAgentService: SiteAgentService) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateSiteAgentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreatedSiteAgentResponse> {
    const { agent, enrolment } = await this.siteAgentService.createAgent(
      organisationId,
      dto,
      req.user.userId,
    );
    return { agent, enrolmentToken: enrolment.token, expiresAt: enrolment.expiresAt };
  }

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findAll(@CurrentOrganisation() organisationId: string): Promise<SiteAgentListItem[]> {
    return this.siteAgentService.listWithScreenCounts(organisationId);
  }

  @Get(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findOne(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SiteAgent> {
    return this.siteAgentService.findOne(organisationId, id);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteAgentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SiteAgent> {
    return this.siteAgentService.updateAgent(organisationId, id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin)
  remove(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.siteAgentService.removeAgent(organisationId, id, req.user.userId);
  }

  /**
   * Issues a fresh enrolment token. Does not disconnect the running agent —
   * revoking is a separate, explicit action, because an operator preparing a
   * replacement machine should not knock the live one offline by doing so.
   */
  @Post(':id/enrolment-token')
  @Roles(OrganisationRole.OrgAdmin)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async reissueEnrolment(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<EnrolmentTokenResponse> {
    const enrolment = await this.siteAgentService.reissueEnrolment(
      organisationId,
      id,
      req.user.userId,
    );
    return { enrolmentToken: enrolment.token, expiresAt: enrolment.expiresAt };
  }

  /** Ends every session; the agent has to be enrolled again to come back. */
  @Post(':id/revoke')
  @Roles(OrganisationRole.OrgAdmin)
  revoke(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ revoked: number }> {
    return this.siteAgentService.revokeAccess(organisationId, id, req.user.userId);
  }
}
