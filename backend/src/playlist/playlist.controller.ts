import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { ReorderPlaylistItemsDto } from './dto/reorder-playlist-items.dto';
import { BulkDeletePlaylistsDto } from './dto/bulk-delete-playlists.dto';
import { BulkAssignScreenDto } from './dto/bulk-assign-screen.dto';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';

@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistService.create(organisationId, dto);
  }

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  findAll(@CurrentOrganisation() organisationId: string): Promise<Playlist[]> {
    return this.playlistService.findAll(organisationId);
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
  ): Promise<Playlist> {
    return this.playlistService.findOne(id, organisationId);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistService.update(id, organisationId, dto);
  }

  @Post('bulk-delete')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  bulkDelete(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkDeletePlaylistsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ deleted: number; notFound: string[] }> {
    return this.playlistService.bulkDelete(
      organisationId,
      dto.ids,
      req.user.userId,
    );
  }

  @Post('bulk-assign-screen')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  bulkAssignScreen(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkAssignScreenDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ assigned: number; notFound: string[] }> {
    return this.playlistService.bulkAssignScreen(
      organisationId,
      dto.ids,
      dto.screenId,
      req.user.userId,
    );
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  delete(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.playlistService.delete(id, organisationId);
  }

  @Post(':id/items')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  addItem(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPlaylistItemDto,
  ): Promise<PlaylistItem> {
    return this.playlistService.addItem(id, organisationId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  removeItem(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.playlistService.removeItem(id, itemId, organisationId);
  }

  @Put(':id/items/reorder')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  reorderItems(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderPlaylistItemsDto,
  ): Promise<PlaylistItem[]> {
    return this.playlistService.reorderItems(id, organisationId, dto.itemIds);
  }

  @Get(':id/duration')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  getTotalDuration(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ totalDurationSeconds: number }> {
    return this.playlistService
      .getTotalDuration(id, organisationId)
      .then((totalDurationSeconds) => ({ totalDurationSeconds }));
  }
}
