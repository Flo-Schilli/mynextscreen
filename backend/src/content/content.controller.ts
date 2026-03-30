import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { UploadContentDto } from './dto/upload-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { getOriginalPath, getTranscodedPath } from './content-storage.util';

@Controller('content')
export class ContentController {
  private readonly mediaBasePath: string;

  constructor(
    private readonly contentService: ContentService,
    private readonly configService: ConfigService,
  ) {
    this.mediaBasePath = this.configService.get<string>(
      'MEDIA_BASE_PATH',
      './media',
    );
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

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
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
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
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
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  async serveOriginal(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const content = await this.contentService.findOne(organisationId, id);
    const ext =
      path.extname(content.originalFilename).replace('.', '') || 'bin';
    const filePath = getOriginalPath(
      this.mediaBasePath,
      organisationId,
      id,
      ext,
    );
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Original file not found');
    }
    res.setHeader('Content-Type', content.originalMimeType);
    res.sendFile(absPath);
  }

  @Get(':id/file/transcoded')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  async serveTranscoded(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const content = await this.contentService.findOne(organisationId, id);
    const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
    const filePath = getTranscodedPath(
      this.mediaBasePath,
      organisationId,
      id,
      transcodedExt,
    );
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Transcoded file not found');
    }
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webp: 'image/webp',
    };
    res.setHeader(
      'Content-Type',
      mimeMap[transcodedExt] || 'application/octet-stream',
    );
    res.sendFile(absPath);
  }
}
