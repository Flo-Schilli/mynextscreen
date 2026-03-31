import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Organisation } from './organisation.entity';
import { Playlist } from '../playlist/playlist.entity';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
export declare class OrganisationService {
    private readonly organisationRepository;
    private readonly playlistRepository;
    private readonly eventEmitter;
    constructor(organisationRepository: Repository<Organisation>, playlistRepository: Repository<Playlist>, eventEmitter: EventEmitter2);
    create(dto: CreateOrganisationDto): Promise<Organisation>;
    findAll(): Promise<Organisation[]>;
    findOne(id: string): Promise<Organisation>;
    update(id: string, dto: UpdateOrganisationDto): Promise<Organisation>;
    setDefaultPlaylist(organisationId: string, playlistId: string | null | undefined): Promise<Organisation>;
}
