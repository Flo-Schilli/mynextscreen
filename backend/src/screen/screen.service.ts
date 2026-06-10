import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens, type Screen } from '../db/schema';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { generateApiKey, hashApiKey } from './api-key.util';
import { ScreenStatusEvent, SCREEN_STATUS_CHANGED } from './screen-status.event';
import {
  AUDIT_SCREEN_REGISTERED,
  AUDIT_SCREEN_UPDATED,
  AUDIT_SCREEN_KEY_REGENERATED,
  AUDIT_SCREEN_ONLINE,
  AUDIT_SCREEN_BULK_DELETED,
  AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
  AuditScreenEvent,
} from '../audit-log/audit.events';

@Injectable()
export class ScreenService extends OrganisationScopedService<Screen> {
  constructor(
    @Inject(DRIZZLE) db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(db, screens, 'Screen');
  }

  /**
   * Create a new screen with a generated API key.
   * Returns the screen and the plaintext API key (shown only once).
   */
  async createScreen(
    organisationId: string,
    dto: CreateScreenDto,
  ): Promise<{ screen: Screen; apiKey: string }> {
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    const screen = await this.create(organisationId, {
      name: dto.name,
      resolution: dto.resolution,
      location: dto.location,
      apiKeyHash,
    });

    this.eventEmitter.emit(
      AUDIT_SCREEN_REGISTERED,
      new AuditScreenEvent(screen.id, organisationId, null, {
        name: dto.name,
      }),
    );

    return { screen, apiKey };
  }

  /**
   * Update a screen's name, resolution, or location.
   */
  async updateScreen(organisationId: string, id: string, dto: UpdateScreenDto): Promise<Screen> {
    const screen = await this.update(organisationId, id, dto);
    this.eventEmitter.emit(
      AUDIT_SCREEN_UPDATED,
      new AuditScreenEvent(id, organisationId, null, null),
    );
    return screen;
  }

  /**
   * Regenerate a screen's API key.
   * Returns the screen and the new plaintext API key (shown only once).
   */
  async regenerateApiKey(
    organisationId: string,
    id: string,
  ): Promise<{ screen: Screen; apiKey: string }> {
    await this.findOne(organisationId, id);
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);
    const [saved] = await this.db
      .update(screens)
      .set({ apiKeyHash })
      .where(and(eq(screens.id, id), eq(screens.organisationId, organisationId)))
      .returning();
    this.eventEmitter.emit(
      AUDIT_SCREEN_KEY_REGENERATED,
      new AuditScreenEvent(id, organisationId, null, null),
    );
    return { screen: saved, apiKey };
  }

  /**
   * Record a heartbeat for a screen, marking it as online.
   * Emits a status change event if the screen was previously offline.
   */
  async recordHeartbeat(organisationId: string, id: string): Promise<Screen> {
    const screen = await this.findOne(organisationId, id);
    const wasOffline = !screen.isOnline;
    const [saved] = await this.db
      .update(screens)
      .set({ lastHeartbeat: new Date(), isOnline: true })
      .where(and(eq(screens.id, id), eq(screens.organisationId, organisationId)))
      .returning();

    if (wasOffline) {
      this.eventEmitter.emit(
        SCREEN_STATUS_CHANGED,
        new ScreenStatusEvent(saved.id, saved.organisationId, true),
      );
      this.eventEmitter.emit(
        AUDIT_SCREEN_ONLINE,
        new AuditScreenEvent(saved.id, saved.organisationId, null, null),
      );
    }

    return saved;
  }

  /**
   * Bulk delete screens by IDs, scoped to the given organisation.
   * Validates that all IDs belong to the organisation (400 on foreign IDs).
   * Emits one audit event per deleted screen.
   */
  async bulkDelete(
    organisationId: string,
    ids: string[],
    userId: string | null,
  ): Promise<{ deleted: number; notFound: string[] }> {
    const found = await this.db
      .select()
      .from(screens)
      .where(and(inArray(screens.id, ids), eq(screens.organisationId, organisationId)));

    const foundIds = new Set(found.map((s) => s.id));
    const notFound: string[] = [];
    const foreignIds: string[] = [];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        const [exists] = await this.db.select().from(screens).where(eq(screens.id, id)).limit(1);
        if (exists) {
          foreignIds.push(id);
        } else {
          notFound.push(id);
        }
      }
    }

    if (foreignIds.length > 0) {
      throw new BadRequestException({
        message: 'Some IDs belong to a different organisation',
        foreignIds,
      });
    }

    if (found.length > 0) {
      await this.db.delete(screens).where(
        inArray(
          screens.id,
          found.map((s) => s.id),
        ),
      );
    }

    const bulkOperationSize = ids.length;
    for (const screen of found) {
      this.eventEmitter.emit(
        AUDIT_SCREEN_BULK_DELETED,
        new AuditScreenEvent(screen.id, organisationId, userId, {
          bulkOperationSize,
        }),
      );
    }

    return { deleted: found.length, notFound };
  }

  /**
   * Bulk assign screens to a group (or remove from group if groupId is null).
   * Validates that all IDs belong to the organisation (400 on foreign IDs).
   * Emits one audit event per updated screen.
   */
  async bulkAssignGroup(
    organisationId: string,
    ids: string[],
    groupId: string | null,
    userId: string | null,
  ): Promise<{ updated: number; notFound: string[] }> {
    const found = await this.db
      .select()
      .from(screens)
      .where(and(inArray(screens.id, ids), eq(screens.organisationId, organisationId)));

    const foundIds = new Set(found.map((s) => s.id));
    const notFound: string[] = [];
    const foreignIds: string[] = [];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        const [exists] = await this.db.select().from(screens).where(eq(screens.id, id)).limit(1);
        if (exists) {
          foreignIds.push(id);
        } else {
          notFound.push(id);
        }
      }
    }

    if (foreignIds.length > 0) {
      throw new BadRequestException({
        message: 'Some IDs belong to a different organisation',
        foreignIds,
      });
    }

    if (found.length > 0) {
      await this.db
        .update(screens)
        .set({ groupId })
        .where(
          inArray(
            screens.id,
            found.map((s) => s.id),
          ),
        );
    }

    const bulkOperationSize = ids.length;
    for (const screen of found) {
      this.eventEmitter.emit(
        AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
        new AuditScreenEvent(screen.id, organisationId, userId, {
          bulkOperationSize,
          groupId,
        }),
      );
    }

    return { updated: found.length, notFound };
  }

  /**
   * Detect and mark screens as offline if their last heartbeat
   * is older than the given threshold.
   * Returns the screens that were marked offline.
   */
  async detectOfflineScreens(thresholdMs: number): Promise<Screen[]> {
    const cutoff = new Date(Date.now() - thresholdMs);
    const staleScreens = await this.db
      .select()
      .from(screens)
      .where(and(eq(screens.isOnline, true), lt(screens.lastHeartbeat, cutoff)));

    if (staleScreens.length > 0) {
      await this.db
        .update(screens)
        .set({ isOnline: false })
        .where(
          inArray(
            screens.id,
            staleScreens.map((s) => s.id),
          ),
        );
    }

    return staleScreens;
  }
}
