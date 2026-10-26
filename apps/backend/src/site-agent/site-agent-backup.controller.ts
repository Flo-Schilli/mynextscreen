import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { SiteAgentBackupService, type CollectedBackup } from './site-agent-backup.service';
import { StageBackupImportDto, StartBackupExportDto } from './dto';

/**
 * The dashboard's side of agent backups. OrgAdmin only: a backup holds the keys
 * to every TV at a venue, sealed or not.
 *
 * Every step answers immediately; what the agent does arrives on the dashboard
 * SSE stream, keyed by the id returned here.
 */
@Controller('site-agents')
export class SiteAgentBackupController {
  constructor(private readonly backups: SiteAgentBackupService) {}

  /** 202 with a `commandId`; 409 when the agent is offline. */
  @Post(':id/backups/export')
  @Roles(OrganisationRole.OrgAdmin)
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startExport(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartBackupExportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ commandId: string }> {
    return this.backups.startExport(organisationId, id, req.user.userId, dto.recipientPublicKey);
  }

  /** The finished export, once, and only for the person who started it. */
  @Get(':id/backups/exports/:commandId')
  @Roles(OrganisationRole.OrgAdmin)
  collectExport(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commandId', ParseUUIDPipe) commandId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CollectedBackup> {
    return this.backups.collectExport(organisationId, id, req.user.userId, commandId);
  }

  /** 202 with a `sessionId`; the agent's key follows on the SSE stream. */
  @Post(':id/backups/import-sessions')
  @Roles(OrganisationRole.OrgAdmin)
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startImport(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ sessionId: string }> {
    return this.backups.startImport(organisationId, id, req.user.userId);
  }

  /** The sealed file and password; the result follows on the SSE stream. */
  @Post(':id/backups/import')
  @Roles(OrganisationRole.OrgAdmin)
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  stageImport(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StageBackupImportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ commandId: string }> {
    return this.backups.stageImport(organisationId, id, req.user.userId, dto);
  }
}
