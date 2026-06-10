import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  scheduleEntries,
  organisations,
  screens,
  playlists,
  screenGroups,
  type ScheduleEntry,
  type Playlist,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
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
import { SLICE_CONTENT_QUEUE } from '../slice-content';
import { SliceContentJobData } from '../slice-content/slice-content.processor';

const OVERLAP_WINDOW_DAYS = 365;

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue(SLICE_CONTENT_QUEUE)
    private readonly sliceContentQueue: Queue<SliceContentJobData>,
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
        startTime,
        endTime,
        rrule: dto.rrule ?? null,
        colour: dto.colour,
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
  ): Promise<ScheduleEntry[]> {
    return this.db.query.scheduleEntries.findMany({
      where: eq(scheduleEntries.organisationId, organisationId),
      with: { playlist: true, screen: true, group: true },
      orderBy: asc(scheduleEntries.startTime),
    });
  }

  async getCurrentPlaylist(
    screenId: string,
  ): Promise<{ playlist: Playlist | null; isDefault: boolean }> {
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
          return { playlist: entry.playlist, isDefault: false };
        }
      }
    }

    // No direct schedule active — check group schedule as fallback
    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (!screen) {
      return { playlist: null, isDefault: false };
    }

    if (screen.groupId) {
      const groupEntries = await this.db.query.scheduleEntries.findMany({
        where: eq(scheduleEntries.groupId, screen.groupId),
        with: { playlist: true },
      });

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
            return { playlist: entry.playlist, isDefault: false };
          }
        }
      }
    }

    return this.getFallbackPlaylist(screen.organisationId);
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

  private async getFallbackPlaylist(
    organisationId: string,
  ): Promise<{ playlist: Playlist | null; isDefault: boolean }> {
    const [org] = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    if (!org?.defaultPlaylistId) {
      return { playlist: null, isDefault: true };
    }
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, org.defaultPlaylistId))
      .limit(1);
    return { playlist: playlist ?? null, isDefault: true };
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

    const [group] = await this.db
      .select()
      .from(screenGroups)
      .where(eq(screenGroups.id, entry.groupId))
      .limit(1);

    if (!group || group.mode !== ScreenGroupMode.Split) return;

    await this.sliceContentQueue.add('slice', {
      groupId: entry.groupId,
      scheduleId: entry.id,
      playlistId: entry.playlistId,
      organisationId: entry.organisationId,
    });
  }
}
