import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { removeOrganisationMedia } from '../content/content-storage.util';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import {
  AUDIT_ORGANISATION_CREATED,
  AUDIT_ORGANISATION_UPDATED,
  AuditOrganisationEvent,
} from '../audit-log/audit.events';

@Injectable()
export class OrganisationService {
  private readonly logger = new Logger(OrganisationService.name);
  private readonly mediaBasePath: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    this.mediaBasePath = this.config.get<string>('MEDIA_BASE_PATH', './media');
  }

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

  /**
   * Super-admin org deletion. Removes the organisation and everything scoped to
   * it (memberships, content, screens, playlists, schedules, sliced renditions,
   * audit entries — all `onDelete: 'cascade'`), then deletes any member who is
   * left with no other org and is not a super-admin, and finally wipes the org's
   * media directory off disk (best-effort, outside the transaction).
   *
   * Logged via the Nest logger rather than the audit trail: `audit_entries`
   * cascades on `organisation_id`, so an audit row tagged with this org would be
   * deleted in the same transaction — making it pointless to write (analogous to
   * the unverified-signup cleanup cron).
   */
  async remove(orgId: string): Promise<void> {
    await this.findOne(orgId);

    const members = await this.db
      .select({ userId: userOrganisationMemberships.userId })
      .from(userOrganisationMemberships)
      .where(eq(userOrganisationMemberships.organisationId, orgId));
    const memberUserIds = [...new Set(members.map((m) => m.userId))];

    await this.db.transaction(async (tx) => {
      // Cascade removes memberships + all org-scoped rows for this org.
      await tx.delete(organisations).where(eq(organisations.id, orgId));

      for (const userId of memberUserIds) {
        const [remaining] = await tx
          .select({ id: userOrganisationMemberships.id })
          .from(userOrganisationMemberships)
          .where(eq(userOrganisationMemberships.userId, userId))
          .limit(1);
        if (remaining) {
          continue;
        }
        const [user] = await tx
          .select({ isSuperAdmin: users.isSuperAdmin })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (user && !user.isSuperAdmin) {
          await tx.delete(users).where(eq(users.id, userId));
        }
      }
    });

    // Best-effort media cleanup after the DB rows are gone; a filesystem error
    // must not roll back the (already committed) deletion.
    try {
      await removeOrganisationMedia(this.mediaBasePath, orgId);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to remove media dir for organisation ${orgId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    this.logger.log(`Organisation deleted orgId=${orgId} removedMembers=${memberUserIds.length}`);
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
