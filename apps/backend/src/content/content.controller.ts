import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ContentService } from './content.service';
import { isSupportedMediaType } from './media-type.util';
import { UploadContentDto } from './dto/upload-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { BulkDeleteContentDto } from './dto/bulk-delete-content.dto';
import { BulkTagContentDto } from './dto/bulk-tag-content.dto';
import { BulkUntagContentDto } from './dto/bulk-untag-content.dto';
import { BulkAddToPlaylistDto } from './dto/bulk-add-to-playlist.dto';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { Content } from '../db/schema';
import { ContentType } from './content-type.enum';
import { getOriginalPath, getTranscodedPath, getThumbnailPath } from './content-storage.util';

@Controller('content')
export class ContentController {
  private readonly mediaBasePath: string;

  constructor(
    private readonly contentService: ContentService,
    private readonly configService: ConfigService,
  ) {
    this.mediaBasePath = this.configService.get<string>('MEDIA_BASE_PATH', './media');
  }

  @Post('upload')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentOrganisation() organisationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadContentDto,
  ): Promise<Content> {
    return this.contentService.upload(organisationId, file, dto);
  }

  @Post('bulk-delete')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  bulkDelete(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkDeleteContentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ deleted: number; notFound: string[] }> {
    return this.contentService.bulkDelete(organisationId, dto.ids, req.user.userId);
  }

  @Post('bulk-tag')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  bulkTag(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkTagContentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ updated: number; notFound: string[] }> {
    return this.contentService.bulkTag(organisationId, dto.ids, dto.tags, req.user.userId);
  }

  @Post('bulk-untag')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  bulkUntag(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkUntagContentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ updated: number; notFound: string[] }> {
    return this.contentService.bulkUntag(organisationId, dto.ids, dto.tags, req.user.userId);
  }

  @Post('bulk-add-to-playlist')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  bulkAddToPlaylist(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkAddToPlaylistDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ added: number; alreadyPresent: number; notFound: string[] }> {
    return this.contentService.bulkAddToPlaylist(
      organisationId,
      dto.ids,
      dto.playlistId,
      req.user.userId,
    );
  }

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findAll(
    @CurrentOrganisation() organisationId: string,
    @Query('type') type?: ContentType,
    @Query('tags') tags?: string,
  ): Promise<Content[]> {
    const parsedTags = tags ? tags.split(',').map((t) => t.trim()) : undefined;
    return this.contentService.findAll(organisationId, {
      type,
      tags: parsedTags,
    });
  }

  @Get(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findOne(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Content> {
    return this.contentService.findOne(organisationId, id);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  updateMetadata(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
  ): Promise<Content> {
    return this.contentService.updateMetadata(organisationId, id, dto);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  delete(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.contentService.delete(organisationId, id);
  }

  @Post(':id/reupload')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  @UseInterceptors(FileInterceptor('file'))
  reUpload(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Content> {
    return this.contentService.reUpload(organisationId, id, file);
  }

  @Get(':id/file/original')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async serveOriginal(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const content = await this.contentService.findOne(organisationId, id);
    const ext = path.extname(content.originalFilename).replace('.', '') || 'bin';
    const filePath = getOriginalPath(this.mediaBasePath, organisationId, id, ext);
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Original file not found');
    }
    // Never echo the stored MIME type back unchecked: older records may still
    // carry a client-supplied value such as image/svg+xml, which the browser
    // would execute from this origin. Known media types render inline, anything
    // else is handed over as an opaque download.
    const isKnownType = isSupportedMediaType(content.originalMimeType);
    res.setHeader(
      'Content-Type',
      isKnownType ? content.originalMimeType : 'application/octet-stream',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', isKnownType ? 'inline' : 'attachment');
    res.sendFile(absPath);
  }

  @Get(':id/file/transcoded')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async serveTranscoded(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const content = await this.contentService.findOne(organisationId, id);
    const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
    const filePath = getTranscodedPath(this.mediaBasePath, organisationId, id, transcodedExt);
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Transcoded file not found');
    }
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webp: 'image/webp',
    };
    res.setHeader('Content-Type', mimeMap[transcodedExt] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(absPath);
  }

  @Get(':id/file/thumbnail')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async serveThumbnail(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    // Verify the content exists in this org (scoping); 404 if no thumbnail yet so
    // the frontend can fall back to the transcoded URL / video preview.
    await this.contentService.findOne(organisationId, id);
    const filePath = getThumbnailPath(this.mediaBasePath, organisationId, id);
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Thumbnail not found');
    }
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(absPath);
  }
}
