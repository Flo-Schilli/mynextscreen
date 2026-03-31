import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { ReorderPlaylistItemsDto } from './dto/reorder-playlist-items.dto';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';
export declare class PlaylistController {
    private readonly playlistService;
    constructor(playlistService: PlaylistService);
    create(organisationId: string, dto: CreatePlaylistDto): Promise<Playlist>;
    findAll(organisationId: string): Promise<Playlist[]>;
    findOne(organisationId: string, id: string): Promise<Playlist>;
    update(organisationId: string, id: string, dto: UpdatePlaylistDto): Promise<Playlist>;
    delete(organisationId: string, id: string): Promise<void>;
    addItem(organisationId: string, id: string, dto: AddPlaylistItemDto): Promise<PlaylistItem>;
    removeItem(organisationId: string, id: string, itemId: string): Promise<void>;
    reorderItems(organisationId: string, id: string, dto: ReorderPlaylistItemsDto): Promise<PlaylistItem[]>;
    getTotalDuration(organisationId: string, id: string): Promise<{
        totalDurationSeconds: number;
    }>;
}
