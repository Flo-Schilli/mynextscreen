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
import { ScreenAuth, ScreenAuthenticatedRequest } from '../auth';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaService } from './media.service';
import { Screen } from '../screen/screen.entity';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
  ) {}

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
      throw new ForbiddenException('Screen does not belong to the requested organisation');
    }

    const { filePath, contentType } = await this.mediaService.getTranscodedFile(
      organisationId,
      contentId,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.sendFile(filePath, { root: '/' });
  }

  @Get('slices/:groupId/:screenId/:contentId')
  @ScreenAuth()
  @Header('Cache-Control', 'public, max-age=86400, immutable')
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

    const screen = await this.screenRepository.findOne({
      where: { id: screenId },
      select: ['id', 'organisationId', 'groupId'],
    });

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
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.sendFile(filePath, { root: '/' });
  }
}
