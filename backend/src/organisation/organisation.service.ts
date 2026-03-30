import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Organisation } from './organisation.entity';
import { Playlist } from '../playlist/playlist.entity';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
import {
  AUDIT_ORGANISATION_CREATED,
  AUDIT_ORGANISATION_UPDATED,
  AuditOrganisationEvent,
} from '../audit-log/audit.events';

@Injectable()
export class OrganisationService {
  constructor(
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateOrganisationDto): Promise<Organisation> {
    const organisation = this.organisationRepository.create(dto);
    const saved = await this.organisationRepository.save(organisation);
    this.eventEmitter.emit(
      AUDIT_ORGANISATION_CREATED,
      new AuditOrganisationEvent(saved.id, null, { name: dto.name }),
    );
    return saved;
  }

  async findAll(): Promise<Organisation[]> {
    return this.organisationRepository.find();
  }

  async findOne(id: string): Promise<Organisation> {
    const organisation = await this.organisationRepository.findOneBy({ id });
    if (!organisation) {
      throw new NotFoundException(`Organisation with id "${id}" not found`);
    }
    return organisation;
  }

  async update(id: string, dto: UpdateOrganisationDto): Promise<Organisation> {
    const organisation = await this.findOne(id);
    Object.assign(organisation, dto);
    const saved = await this.organisationRepository.save(organisation);
    this.eventEmitter.emit(
      AUDIT_ORGANISATION_UPDATED,
      new AuditOrganisationEvent(id, null, null),
    );
    return saved;
  }

  async setDefaultPlaylist(
    organisationId: string,
    playlistId: string | null | undefined,
  ): Promise<Organisation> {
    const organisation = await this.findOne(organisationId);

    if (playlistId) {
      const playlist = await this.playlistRepository.findOne({
        where: { id: playlistId },
      });
      if (!playlist) {
        throw new NotFoundException(
          `Playlist with id "${playlistId}" not found`,
        );
      }
      if (playlist.organisationId !== organisationId) {
        throw new BadRequestException(
          'Playlist does not belong to this organisation',
        );
      }
      organisation.defaultPlaylistId = playlistId;
    } else {
      organisation.defaultPlaylistId = null;
    }

    return this.organisationRepository.save(organisation);
  }
}
