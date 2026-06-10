import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  organisations,
  playlists,
  users,
  userOrganisationMemberships,
  type Organisation,
} from '../db/schema';
import { OrganisationRole } from '../user/organisation-role.enum';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import {
  AUDIT_ORGANISATION_CREATED,
  AUDIT_ORGANISATION_UPDATED,
  AuditOrganisationEvent,
} from '../audit-log/audit.events';

@Injectable()
export class OrganisationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateOrganisationDto, creator?: AuthenticatedUser): Promise<Organisation> {
    const [saved] = await this.db.insert(organisations).values(dto).returning();
    this.eventEmitter.emit(
      AUDIT_ORGANISATION_CREATED,
      new AuditOrganisationEvent(saved.id, null, { name: dto.name }),
    );

    // Auto-add the creator as OrgAdmin
    if (creator) {
      const [existing] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, creator.userId))
        .limit(1);
      if (!existing) {
        await this.db.insert(users).values({ id: creator.userId, email: creator.email });
      }
      await this.db.insert(userOrganisationMemberships).values({
        userId: creator.userId,
        organisationId: saved.id,
        role: OrganisationRole.OrgAdmin,
      });
    }

    return saved;
  }

  async findAll(): Promise<Organisation[]> {
    return this.db.select().from(organisations);
  }

  async findOne(id: string): Promise<Organisation> {
    const [organisation] = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, id))
      .limit(1);
    if (!organisation) {
      throw new NotFoundException(`Organisation with id "${id}" not found`);
    }
    return organisation;
  }

  async update(id: string, dto: UpdateOrganisationDto): Promise<Organisation> {
    await this.findOne(id);
    const [saved] = await this.db
      .update(organisations)
      .set(dto)
      .where(eq(organisations.id, id))
      .returning();
    this.eventEmitter.emit(AUDIT_ORGANISATION_UPDATED, new AuditOrganisationEvent(id, null, null));
    return saved;
  }

  async setDefaultPlaylist(
    organisationId: string,
    playlistId: string | null | undefined,
  ): Promise<Organisation> {
    await this.findOne(organisationId);

    if (playlistId) {
      const [playlist] = await this.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .limit(1);
      if (!playlist) {
        throw new NotFoundException(`Playlist with id "${playlistId}" not found`);
      }
      if (playlist.organisationId !== organisationId) {
        throw new BadRequestException('Playlist does not belong to this organisation');
      }
    }

    const [saved] = await this.db
      .update(organisations)
      .set({ defaultPlaylistId: playlistId ?? null })
      .where(eq(organisations.id, organisationId))
      .returning();
    return saved;
  }
}
