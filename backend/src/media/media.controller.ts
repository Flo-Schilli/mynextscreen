import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  ForbiddenException,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ScreenAuth, ScreenAuthenticatedRequest } from '../auth';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':organisationId/:contentId')
  @ScreenAuth()
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  async serveMedia(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (req.organisationId !== organisationId) {
      throw new ForbiddenException(
        'Screen does not belong to the requested organisation',
      );
    }

    const { filePath, contentType } = await this.mediaService.getTranscodedFile(
      organisationId,
      contentId,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.sendFile(filePath, { root: '/' });
  }
}
