import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { UserScoped } from '../auth/user-scoped.decorator';
import { PlayerAppsService, PlayerAppMeta } from './player-apps.service';

/**
 * Player app downloads and setup guides. The payload is repo-owned static
 * content (see PLAYER_APP_DEFS), identical for every tenant, so these routes
 * are authenticated but carry no organisation scope.
 */
@Controller('player-apps')
@UserScoped()
export class PlayerAppsController {
  constructor(private readonly playerAppsService: PlayerAppsService) {}

  @Get()
  listApps(): PlayerAppMeta[] {
    return this.playerAppsService.listApps();
  }

  @Get(':slug/guide')
  async getGuide(@Param('slug') slug: string): Promise<string> {
    return this.playerAppsService.getGuideHtml(slug);
  }

  @Get(':slug/download')
  downloadBinary(@Param('slug') slug: string, @Res() res: Response): void {
    const filePath = this.playerAppsService.getBinaryPath(slug);
    const filename = this.playerAppsService.getBinaryFilename(slug);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath, { root: '/' });
  }
}
