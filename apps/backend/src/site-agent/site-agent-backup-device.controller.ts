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
import { AgentAuth } from '../auth/agent-auth.decorator';
import type { AgentAuthenticatedRequest } from '../auth/agent-auth.guard';
import { SiteAgentBackupService, type CollectedBackup } from './site-agent-backup.service';
import {
  AgentBackupExportDto,
  AgentBackupImportKeyDto,
  AgentBackupImportResultDto,
  AgentBackupRestoreDto,
} from './dto';

/**
 * The agent's side of backups. Each route answers only for an export or import
 * session that was opened for the calling agent; any other id is a 404 with no
 * hint whether it exists.
 */
@Controller('agents/me/backups')
export class SiteAgentBackupDeviceController {
  constructor(private readonly backups: SiteAgentBackupService) {}

  @Post('exports/:commandId')
  @AgentAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  receiveExport(
    @Req() req: AgentAuthenticatedRequest,
    @Param('commandId', ParseUUIDPipe) commandId: string,
    @Body() dto: AgentBackupExportDto,
  ): Promise<void> {
    return this.backups.receiveExport(req.agentId, commandId, dto);
  }

  @Post('imports/:sessionId/key')
  @AgentAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  receiveImportKey(
    @Req() req: AgentAuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: AgentBackupImportKeyDto,
  ): Promise<void> {
    return this.backups.receiveImportKey(req.agentId, sessionId, dto);
  }

  @Get('imports/:sessionId')
  @AgentAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  fetchImport(
    @Req() req: AgentAuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<CollectedBackup> {
    return this.backups.fetchImport(req.agentId, sessionId);
  }

  @Post('imports/:sessionId/restore')
  @AgentAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  restore(
    @Req() req: AgentAuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: AgentBackupRestoreDto,
  ): Promise<{
    assignedScreenIds: string[];
    skipped: Array<{ screenId: string; reason: string }>;
  }> {
    return this.backups.restore(req.agentId, sessionId, dto);
  }

  @Post('imports/:sessionId/result')
  @AgentAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  receiveImportResult(
    @Req() req: AgentAuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: AgentBackupImportResultDto,
  ): Promise<void> {
    return this.backups.receiveImportResult(req.agentId, sessionId, dto);
  }
}
