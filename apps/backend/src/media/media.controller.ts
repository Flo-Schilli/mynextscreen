import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  ForbiddenException,
  NotFoundException,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ScreenAuth, ScreenAuthenticatedRequest } from '../auth';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens } from '../db/schema';
import { MediaService } from './media.service';
import { SignedMediaUrl } from '../auth/signed-media.decorator';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  @Get(':organisationId/:contentId')
  @ScreenAuth()
  @SignedMediaUrl()
  @Header('Cache-Control', 'public, max-age=86400')
  async serveMedia(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (req.organisationId !== organisationId) {
      throw new ForbiddenException('Screen does not belong to the requested organisation');
    }

    const { filePath, contentType } = await this.mediaService.getTranscodedFile(
      organisationId,
      contentId,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath, { root: '/' });
  }

  @Get('slices/:groupId/:screenId/:contentId')
  @ScreenAuth()
  @SignedMediaUrl()
  @Header('Cache-Control', 'public, max-age=86400')
  async serveSlicedMedia(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (req.screenId !== screenId) {
      throw new ForbiddenException('Authenticated screen does not match the requested screen');
    }

    const [screen] = await this.db
      .select({
        id: screens.id,
        organisationId: screens.organisationId,
        groupId: screens.groupId,
      })
      .from(screens)
      .where(eq(screens.id, screenId))
      .limit(1);

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    if (screen.organisationId !== req.organisationId) {
      throw new ForbiddenException('Screen does not belong to the requested organisation');
    }

    if (screen.groupId !== groupId) {
      throw new ForbiddenException('Screen does not belong to the requested group');
    }

    const { filePath, contentType } = await this.mediaService.getSlicedFile(
      groupId,
      screenId,
      contentId,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath, { root: '/' });
  }
}
