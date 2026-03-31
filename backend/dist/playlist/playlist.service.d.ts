import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Content } from '../content/content.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
export declare class PlaylistService {
    private readonly playlistRepository;
    private readonly playlistItemRepository;
    private readonly organisationRepository;
    private readonly contentRepository;
    private readonly eventEmitter;
    constructor(playlistRepository: Repository<Playlist>, playlistItemRepository: Repository<PlaylistItem>, organisationRepository: Repository<Organisation>, contentRepository: Repository<Content>, eventEmitter: EventEmitter2);
    create(organisationId: string, dto: CreatePlaylistDto): Promise<Playlist>;
    findAll(organisationId: string): Promise<Playlist[]>;
    findOne(id: string, organisationId: string): Promise<Playlist>;
    update(id: string, organisationId: string, dto: UpdatePlaylistDto): Promise<Playlist>;
    addItem(id: string, organisationId: string, dto: AddPlaylistItemDto): Promise<PlaylistItem>;
    removeItem(playlistId: string, itemId: string, organisationId: string): Promise<void>;
    reorderItems(playlistId: string, organisationId: string, itemIds: string[]): Promise<PlaylistItem[]>;
    delete(id: string, organisationId: string): Promise<void>;
    getTotalDuration(id: string, organisationId: string): Promise<number>;
    private emitPlaylistChanged;
}
