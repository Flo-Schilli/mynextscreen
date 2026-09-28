import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  scheduleEntries,
  organisations,
  screens,
  playlists,
  screenGroups,
  sliceJobs,
  type ScheduleEntry,
  type Playlist,
  type SliceJob,
} from '../db/schema';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { getOccurrences, DateRange } from './rrule.util';
import {
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntryChangedEvent,
  GROUP_SCHEDULE_CHANGED,
  GroupScheduleChangedEvent,
} from './schedule.event';
import {
  AUDIT_SCHEDULE_CREATED,
  AUDIT_SCHEDULE_UPDATED,
  AUDIT_SCHEDULE_DELETED,
  AuditScheduleEvent,
} from '../audit-log/audit.events';
import { SliceEnqueueService } from '../slice-content';
import { SliceStatus } from '../slice-content/slice-status.enum';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';

const OVERLAP_WINDOW_DAYS = 365;

/**
 * Epoch used to anchor deterministic playback for the fallback/default playlist
 * (no active schedule). A fixed value means every screen in a group computes the
 * same modulo position purely from the synchronized clock.
 */
const FALLBACK_EPOCH = 0;

/**
 * Result of resolving the currently-active playlist for a screen, including the
 * shared playback `epoch` (ms) that anchors synchronized transitions across a group.
 */
export interface CurrentPlaylistResult {
  playlist: Playlist | null;
  isDefault: boolean;
  epoch: number;
}

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly sliceEnqueue: SliceEnqueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(organisationId: string, dto: CreateScheduleEntryDto): Promise<ScheduleEntry> {
    this.validateTarget(dto.screenId, dto.groupId);

    if (dto.screenId) {
      await this.validateScreen(dto.screenId, organisationId);
    }
    if (dto.groupId) {
      await this.validateGroup(dto.groupId, organisationId);
    }
    await this.validatePlaylist(dto.playlistId, organisationId);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (dto.screenId) {
      await this.checkOverlap(
        dto.screenId,
        organisationId,
        startTime,
        endTime,
        dto.rrule ?? null,
        null,
      );
    }

    const [saved] = await this.db
      .insert(scheduleEntries)
      .values({
        organisationId,
        screenId: dto.screenId ?? null,
        groupId: dto.groupId ?? null,
        playlistId: dto.playlistId,
        name: dto.name?.trim() ? dto.name.trim() : null,
        startTime,
        endTime,
        rrule: dto.rrule ?? null,
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.colour !== undefined ? { colour: dto.colour } : {}),
      })
      .returning();
    if (saved.screenId) {
      this.emitScheduleChanged(saved.screenId, organisationId);
    }
    if (saved.groupId) {
      this.emitGroupScheduleChanged(saved.groupId, organisationId, saved.playlistId);
    }
    this.eventEmitter.emit(
      AUDIT_SCHEDULE_CREATED,
      new AuditScheduleEvent(saved.id, organisationId, null, {
        screenId: dto.screenId ?? null,
        groupId: dto.groupId ?? null,
        playlistId: dto.playlistId,
      }),
    );

    await this.enqueueSliceJobIfNeeded(saved);

    return saved;
  }

  async update(
    id: string,
    organisationId: string,
    dto: UpdateScheduleEntryDto,
  ): Promise<ScheduleEntry> {
    const entry = await this.findOneOrFail(id, organisationId);

    const startTime = dto.startTime ? new Date(dto.startTime) : entry.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : entry.endTime;
    const rrule = dto.rrule !== undefined ? dto.rrule : entry.rrule;

    if (dto.playlistId) {
      await this.validatePlaylist(dto.playlistId, organisationId);
    }

    if (entry.screenId && (dto.startTime || dto.endTime || dto.rrule !== undefined)) {
      await this.checkOverlap(
        entry.screenId,
        organisationId,
        startTime,
        endTime,
        rrule ?? null,
        id,
      );
    }

    const updates: Partial<ScheduleEntry> = {};
    if (dto.playlistId !== undefined) updates.playlistId = dto.playlistId;
    if (dto.name !== undefined) updates.name = dto.name?.trim() ? dto.name.trim() : null;
    if (dto.priority !== undefined) updates.priority = dto.priority;
    if (dto.startTime !== undefined) updates.startTime = startTime;
    if (dto.endTime !== undefined) updates.endTime = endTime;
    if (dto.rrule !== undefined) updates.rrule = rrule ?? null;
    if (dto.colour !== undefined) updates.colour = dto.colour;

    const [saved] = await this.db
      .update(scheduleEntries)
      .set(updates)
      .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.organisationId, organisationId)))
      .returning();
    if (saved.screenId) {
      this.emitScheduleChanged(saved.screenId, organisationId);
    }
    if (saved.groupId) {
      this.emitGroupScheduleChanged(saved.groupId, organisationId, saved.playlistId);
    }
    this.eventEmitter.emit(
      AUDIT_SCHEDULE_UPDATED,
      new AuditScheduleEvent(saved.id, organisationId, null, {
        screenId: saved.screenId,
      }),
    );

    await this.enqueueSliceJobIfNeeded(saved);

    return saved;
  }

  async delete(id: string, organisationId: string): Promise<void> {
    const entry = await this.findOneOrFail(id, organisationId);
    const screenId = entry.screenId;
    const groupId = entry.groupId;
    const playlistId = entry.playlistId;
    await this.db
      .delete(scheduleEntries)
      .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.organisationId, organisationId)));
    if (screenId) {
      this.emitScheduleChanged(screenId, organisationId);
    }
    if (groupId) {
      this.emitGroupScheduleChanged(groupId, organisationId, playlistId);
    }
    this.eventEmitter.emit(
      AUDIT_SCHEDULE_DELETED,
      new AuditScheduleEvent(id, organisationId, null, { screenId, groupId }),
    );
  }

  async findByScreen(
    screenId: string,
    organisationId: string,
    _from: Date,
    _to: Date,
  ): Promise<(ScheduleEntry & { playlist: Playlist })[]> {
    return this.db.query.scheduleEntries.findMany({
      where: and(
        eq(scheduleEntries.screenId, screenId),
        eq(scheduleEntries.organisationId, organisationId),
      ),
      with: { playlist: true },
      orderBy: asc(scheduleEntries.startTime),
    });
  }

  async findByOrganisation(
    organisationId: string,
    _from: Date,
    _to: Date,
  ): Promise<(ScheduleEntry & { sliceStatus?: SliceJob | null })[]> {
    const entries = await this.db.query.scheduleEntries.findMany({
      where: eq(scheduleEntries.organisationId, organisationId),
      with: { playlist: true, screen: true, group: true },
      orderBy: asc(scheduleEntries.startTime),
    });

    // Attach split-group slicing status to each group entry so the calendar can
    // badge "preparing renditions". Keyed by (groupId, playlistId).
    const jobs = await this.db
      .select()
      .from(sliceJobs)
      .where(eq(sliceJobs.organisationId, organisationId));
    const byKey = new Map(jobs.map((j) => [`${j.groupId}:${j.playlistId}`, j]));

    return entries.map((entry) =>
      entry.groupId
        ? { ...entry, sliceStatus: byKey.get(`${entry.groupId}:${entry.playlistId}`) ?? null }
        : entry,
    );
  }

  /**
   * Organisation-scoped entry point for the API.
   *
   * `getCurrentPlaylist` below is also called internally for a screen the server
   * has already resolved (screen state, schedule boundaries, group protocol), so
   * it deliberately takes no tenant. That made the HTTP route which called it
   * directly readable across tenants — anyone with a screen UUID could read any
   * organisation's current playlist. The tenant check therefore lives here.
   */
  async getCurrentPlaylistScoped(
    organisationId: string,
    screenId: string,
  ): Promise<CurrentPlaylistResult> {
    const [screen] = await this.db
      .select({ id: screens.id })
      .from(screens)
      .where(and(eq(screens.id, screenId), eq(screens.organisationId, organisationId)))
      .limit(1);

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    return this.getCurrentPlaylist(screenId);
  }

  async getCurrentPlaylist(screenId: string): Promise<CurrentPlaylistResult> {
    const now = new Date();

    // Find all direct entries for this screen
    const entries = await this.db.query.scheduleEntries.findMany({
      where: eq(scheduleEntries.screenId, screenId),
      with: { playlist: true },
    });

    // Check if any direct entry is currently active
    for (const entry of entries) {
      const occurrences = getOccurrences(
        entry.startTime,
        entry.endTime,
        entry.rrule,
        new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day before
        new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day after
      );

      for (const occ of occurrences) {
        if (occ.start <= now && occ.end > now) {
          // Epoch = start of the active occurrence. Identical for every screen
          // in a group, so all members compute the same playlist position.
          return { playlist: entry.playlist, isDefault: false, epoch: occ.start.getTime() };
        }
      }
    }

    // No direct schedule active — check group schedule as fallback
    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (!screen) {
      return { playlist: null, isDefault: false, epoch: FALLBACK_EPOCH };
    }

    if (screen.groupId) {
      const groupEntries = await this.db.query.scheduleEntries.findMany({
        where: eq(scheduleEntries.groupId, screen.groupId),
        with: { playlist: true },
      });

      // Split groups need per-screen sliced renditions before the wall can show a
      // playlist. Until the slice job for that playlist is `completed`, the entry
      // is NOT yet eligible to be "current" — we skip it so resolution falls
      // through to the previously-active content (other entry / fallback). The
      // moment slicing completes, `GROUP_SCHEDULE_CHANGED` re-pulls and the entry
      // becomes current. A `failed` job also keeps the previous content (operator
      // must re-slice). Mirror groups never slice, so they are unaffected.
      const isSplitGroup = await this.isSplitGroup(screen.groupId);
      const sliceReady = isSplitGroup
        ? await this.loadCompletedSlicePlaylists(screen.groupId)
        : null;

      for (const entry of groupEntries) {
        const occurrences = getOccurrences(
          entry.startTime,
          entry.endTime,
          entry.rrule,
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
          new Date(now.getTime() + 24 * 60 * 60 * 1000),
        );

        for (const occ of occurrences) {
          if (occ.start <= now && occ.end > now) {
            if (sliceReady && !sliceReady.has(entry.playlistId)) {
              // Not-yet-sliced split entry: ignore it, keep previous content.
              break;
            }
            return { playlist: entry.playlist, isDefault: false, epoch: occ.start.getTime() };
          }
        }
      }
    }

    return this.getFallbackPlaylist(screen.organisationId);
  }

  /** True if the group exists and is in split (video-wall) mode. */
  private async isSplitGroup(groupId: string): Promise<boolean> {
    const [group] = await this.db
      .select({ mode: screenGroups.mode })
      .from(screenGroups)
      .where(eq(screenGroups.id, groupId))
      .limit(1);
    return group?.mode === ScreenGroupMode.Split;
  }

  /** Playlist IDs whose slice job for this group is `completed` (renditions ready). */
  private async loadCompletedSlicePlaylists(groupId: string): Promise<Set<string>> {
    const jobs = await this.db
      .select({ playlistId: sliceJobs.playlistId, status: sliceJobs.status })
      .from(sliceJobs)
      .where(eq(sliceJobs.groupId, groupId));
    return new Set(jobs.filter((j) => j.status === SliceStatus.Completed).map((j) => j.playlistId));
  }

  async checkOverlap(
    screenId: string,
    organisationId: string,
    startTime: Date,
    endTime: Date,
    rrule: string | null,
    excludeEntryId: string | null,
  ): Promise<void> {
    const windowStart = new Date(Math.min(startTime.getTime(), Date.now()));
    const windowEnd = new Date(windowStart.getTime() + OVERLAP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Get new entry's occurrences
    const newOccurrences = getOccurrences(startTime, endTime, rrule, windowStart, windowEnd);

    // Get all existing entries for this screen
    const existingEntries = await this.db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.screenId, screenId),
          eq(scheduleEntries.organisationId, organisationId),
        ),
      );

    for (const existing of existingEntries) {
      if (excludeEntryId && existing.id === excludeEntryId) continue;

      const existingOccurrences = getOccurrences(
        existing.startTime,
        existing.endTime,
        existing.rrule,
        windowStart,
        windowEnd,
      );

      if (this.rangesOverlap(newOccurrences, existingOccurrences)) {
        throw new ConflictException(
          'Schedule entry overlaps with an existing entry on this screen',
        );
      }
    }
  }

  private rangesOverlap(rangesA: DateRange[], rangesB: DateRange[]): boolean {
    for (const a of rangesA) {
      for (const b of rangesB) {
        if (a.start < b.end && a.end > b.start) {
          return true;
        }
      }
    }
    return false;
  }

  private async findOneOrFail(id: string, organisationId: string): Promise<ScheduleEntry> {
    const [entry] = await this.db
      .select()
      .from(scheduleEntries)
      .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.organisationId, organisationId)))
      .limit(1);
    if (!entry) {
      throw new NotFoundException(
        `Schedule entry with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return entry;
  }

  private validateTarget(screenId?: string, groupId?: string): void {
    if (screenId && groupId) {
      throw new BadRequestException('Exactly one of screenId or groupId must be set, not both');
    }
    if (!screenId && !groupId) {
      throw new BadRequestException('Exactly one of screenId or groupId must be set');
    }
  }

  private async validateGroup(groupId: string, organisationId: string): Promise<void> {
    const [group] = await this.db
      .select()
      .from(screenGroups)
      .where(and(eq(screenGroups.id, groupId), eq(screenGroups.organisationId, organisationId)))
      .limit(1);
    if (!group) {
      throw new NotFoundException(
        `Screen group with id "${groupId}" not found in organisation "${organisationId}"`,
      );
    }
  }

  private async validateScreen(screenId: string, organisationId: string): Promise<void> {
    const [screen] = await this.db
      .select()
      .from(screens)
      .where(and(eq(screens.id, screenId), eq(screens.organisationId, organisationId)))
      .limit(1);
    if (!screen) {
      throw new NotFoundException(
        `Screen with id "${screenId}" not found in organisation "${organisationId}"`,
      );
    }
  }

  private async validatePlaylist(playlistId: string, organisationId: string): Promise<void> {
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.organisationId, organisationId)))
      .limit(1);
    if (!playlist) {
      throw new NotFoundException(
        `Playlist with id "${playlistId}" not found in organisation "${organisationId}"`,
      );
    }
  }

  private async getFallbackPlaylist(organisationId: string): Promise<CurrentPlaylistResult> {
    const [org] = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    if (!org?.defaultPlaylistId) {
      return { playlist: null, isDefault: true, epoch: FALLBACK_EPOCH };
    }
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, org.defaultPlaylistId))
      .limit(1);
    return { playlist: playlist ?? null, isDefault: true, epoch: FALLBACK_EPOCH };
  }

  private emitScheduleChanged(screenId: string, organisationId: string): void {
    this.eventEmitter.emit(
      SCHEDULE_ENTRY_CHANGED,
      new ScheduleEntryChangedEvent(screenId, organisationId),
    );
  }

  private emitGroupScheduleChanged(
    groupId: string,
    organisationId: string,
    playlistId: string,
  ): void {
    this.eventEmitter.emit(
      GROUP_SCHEDULE_CHANGED,
      new GroupScheduleChangedEvent(groupId, organisationId, playlistId),
    );
  }

  private async enqueueSliceJobIfNeeded(entry: ScheduleEntry): Promise<void> {
    if (!entry.groupId) return;
    await this.sliceEnqueue.enqueueForGroup(
      entry.organisationId,
      entry.groupId,
      entry.playlistId,
      entry.id,
    );
  }
}
