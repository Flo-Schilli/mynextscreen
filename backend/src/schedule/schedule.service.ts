import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ScheduleEntry } from './schedule-entry.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
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
    @InjectRepository(ScheduleEntry)
    private readonly scheduleEntryRepository: Repository<ScheduleEntry>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(ScreenGroup)
    private readonly screenGroupRepository: Repository<ScreenGroup>,
    @InjectQueue(SLICE_CONTENT_QUEUE)
    private readonly sliceContentQueue: Queue<SliceContentJobData>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organisationId: string,
    dto: CreateScheduleEntryDto,
  ): Promise<ScheduleEntry> {
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

    const entry = this.scheduleEntryRepository.create({
      organisationId,
      screenId: dto.screenId ?? null,
      groupId: dto.groupId ?? null,
      playlistId: dto.playlistId,
      startTime,
      endTime,
      rrule: dto.rrule ?? null,
      colour: dto.colour,
    });

    const saved = await this.scheduleEntryRepository.save(entry);
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

    if (dto.playlistId !== undefined) entry.playlistId = dto.playlistId;
    if (dto.startTime !== undefined) entry.startTime = startTime;
    if (dto.endTime !== undefined) entry.endTime = endTime;
    if (dto.rrule !== undefined) entry.rrule = rrule ?? null;
    if (dto.colour !== undefined) entry.colour = dto.colour;

    const saved = await this.scheduleEntryRepository.save(entry);
    if (entry.screenId) {
      this.emitScheduleChanged(entry.screenId, organisationId);
    }
    if (saved.groupId) {
      this.emitGroupScheduleChanged(saved.groupId, organisationId, saved.playlistId);
    }
    this.eventEmitter.emit(
      AUDIT_SCHEDULE_UPDATED,
      new AuditScheduleEvent(saved.id, organisationId, null, {
        screenId: entry.screenId,
      }),
    );

    await this.enqueueSliceJobIfNeeded(saved);

    return saved;
  }

  async delete(id: string, organisationId: string): Promise<void> {
    const entry = await this.findOneOrFail(id, organisationId);
    const screenId = entry.screenId;
    await this.scheduleEntryRepository.remove(entry);
    if (screenId) {
      this.emitScheduleChanged(screenId, organisationId);
    }
    this.eventEmitter.emit(
      AUDIT_SCHEDULE_DELETED,
      new AuditScheduleEvent(id, organisationId, null, { screenId }),
    );
  }

  async findByScreen(
    screenId: string,
    organisationId: string,
    _from: Date,
    _to: Date,
  ): Promise<ScheduleEntry[]> {
    return this.scheduleEntryRepository.find({
      where: {
        screenId,
        organisationId,
      },
      relations: ['playlist'],
      order: { startTime: 'ASC' },
    });
  }

  async findByOrganisation(
    organisationId: string,
    _from: Date,
    _to: Date,
  ): Promise<ScheduleEntry[]> {
    return this.scheduleEntryRepository.find({
      where: {
        organisationId,
      },
      relations: ['playlist', 'screen', 'group'],
      order: { startTime: 'ASC' },
    });
  }

  async getCurrentPlaylist(
    screenId: string,
  ): Promise<{ playlist: Playlist | null; isDefault: boolean }> {
    const now = new Date();

    // Find all direct entries for this screen
    const entries = await this.scheduleEntryRepository.find({
      where: { screenId },
      relations: ['playlist'],
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
    const screen = await this.screenRepository.findOne({
      where: { id: screenId },
    });
    if (!screen) {
      return { playlist: null, isDefault: false };
    }

    if (screen.groupId) {
      const groupEntries = await this.scheduleEntryRepository.find({
        where: { groupId: screen.groupId },
        relations: ['playlist'],
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
    const windowEnd = new Date(
      windowStart.getTime() + OVERLAP_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    // Get new entry's occurrences
    const newOccurrences = getOccurrences(
      startTime,
      endTime,
      rrule,
      windowStart,
      windowEnd,
    );

    // Get all existing entries for this screen
    const existingEntries = await this.scheduleEntryRepository.find({
      where: { screenId, organisationId },
    });

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

  private async findOneOrFail(
    id: string,
    organisationId: string,
  ): Promise<ScheduleEntry> {
    const entry = await this.scheduleEntryRepository.findOne({
      where: { id, organisationId },
      relations: ['playlist'],
    });
    if (!entry) {
      throw new NotFoundException(
        `Schedule entry with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return entry;
  }

  private validateTarget(
    screenId?: string,
    groupId?: string,
  ): void {
    if (screenId && groupId) {
      throw new BadRequestException(
        'Exactly one of screenId or groupId must be set, not both',
      );
    }
    if (!screenId && !groupId) {
      throw new BadRequestException(
        'Exactly one of screenId or groupId must be set',
      );
    }
  }

  private async validateGroup(
    groupId: string,
    organisationId: string,
  ): Promise<void> {
    const group = await this.screenGroupRepository.findOne({
      where: { id: groupId, organisationId },
    });
    if (!group) {
      throw new NotFoundException(
        `Screen group with id "${groupId}" not found in organisation "${organisationId}"`,
      );
    }
  }

  private async validateScreen(
    screenId: string,
    organisationId: string,
  ): Promise<void> {
    const screen = await this.screenRepository.findOne({
      where: { id: screenId, organisationId },
    });
    if (!screen) {
      throw new NotFoundException(
        `Screen with id "${screenId}" not found in organisation "${organisationId}"`,
      );
    }
  }

  private async validatePlaylist(
    playlistId: string,
    organisationId: string,
  ): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, organisationId },
    });
    if (!playlist) {
      throw new NotFoundException(
        `Playlist with id "${playlistId}" not found in organisation "${organisationId}"`,
      );
    }
  }

  private async getFallbackPlaylist(
    organisationId: string,
  ): Promise<{ playlist: Playlist | null; isDefault: boolean }> {
    const org = await this.organisationRepository.findOne({
      where: { id: organisationId },
    });
    if (!org?.defaultPlaylistId) {
      return { playlist: null, isDefault: true };
    }
    const playlist = await this.playlistRepository.findOne({
      where: { id: org.defaultPlaylistId },
    });
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

    const group = await this.screenGroupRepository.findOne({
      where: { id: entry.groupId },
    });

    if (!group || group.mode !== ScreenGroupMode.Split) return;

    await this.sliceContentQueue.add('slice', {
      groupId: entry.groupId,
      scheduleId: entry.id,
      playlistId: entry.playlistId,
      organisationId: entry.organisationId,
    });
  }
}
