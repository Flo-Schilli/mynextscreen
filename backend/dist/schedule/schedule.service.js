"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_2 = require("typeorm");
const bullmq_2 = require("bullmq");
const schedule_entry_entity_1 = require("./schedule-entry.entity");
const organisation_entity_1 = require("../organisation/organisation.entity");
const screen_entity_1 = require("../screen/screen.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const screen_group_mode_enum_1 = require("../screen-group/screen-group-mode.enum");
const rrule_util_1 = require("./rrule.util");
const schedule_event_1 = require("./schedule.event");
const audit_events_1 = require("../audit-log/audit.events");
const slice_content_1 = require("../slice-content");
const OVERLAP_WINDOW_DAYS = 365;
let ScheduleService = class ScheduleService {
    scheduleEntryRepository;
    organisationRepository;
    screenRepository;
    playlistRepository;
    screenGroupRepository;
    sliceContentQueue;
    eventEmitter;
    constructor(scheduleEntryRepository, organisationRepository, screenRepository, playlistRepository, screenGroupRepository, sliceContentQueue, eventEmitter) {
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.organisationRepository = organisationRepository;
        this.screenRepository = screenRepository;
        this.playlistRepository = playlistRepository;
        this.screenGroupRepository = screenGroupRepository;
        this.sliceContentQueue = sliceContentQueue;
        this.eventEmitter = eventEmitter;
    }
    async create(organisationId, dto) {
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
            await this.checkOverlap(dto.screenId, organisationId, startTime, endTime, dto.rrule ?? null, null);
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
        this.eventEmitter.emit(audit_events_1.AUDIT_SCHEDULE_CREATED, new audit_events_1.AuditScheduleEvent(saved.id, organisationId, null, {
            screenId: dto.screenId ?? null,
            groupId: dto.groupId ?? null,
            playlistId: dto.playlistId,
        }));
        await this.enqueueSliceJobIfNeeded(saved);
        return saved;
    }
    async update(id, organisationId, dto) {
        const entry = await this.findOneOrFail(id, organisationId);
        const startTime = dto.startTime ? new Date(dto.startTime) : entry.startTime;
        const endTime = dto.endTime ? new Date(dto.endTime) : entry.endTime;
        const rrule = dto.rrule !== undefined ? dto.rrule : entry.rrule;
        if (dto.playlistId) {
            await this.validatePlaylist(dto.playlistId, organisationId);
        }
        if (entry.screenId && (dto.startTime || dto.endTime || dto.rrule !== undefined)) {
            await this.checkOverlap(entry.screenId, organisationId, startTime, endTime, rrule ?? null, id);
        }
        if (dto.playlistId !== undefined)
            entry.playlistId = dto.playlistId;
        if (dto.startTime !== undefined)
            entry.startTime = startTime;
        if (dto.endTime !== undefined)
            entry.endTime = endTime;
        if (dto.rrule !== undefined)
            entry.rrule = rrule ?? null;
        if (dto.colour !== undefined)
            entry.colour = dto.colour;
        const saved = await this.scheduleEntryRepository.save(entry);
        if (entry.screenId) {
            this.emitScheduleChanged(entry.screenId, organisationId);
        }
        if (saved.groupId) {
            this.emitGroupScheduleChanged(saved.groupId, organisationId, saved.playlistId);
        }
        this.eventEmitter.emit(audit_events_1.AUDIT_SCHEDULE_UPDATED, new audit_events_1.AuditScheduleEvent(saved.id, organisationId, null, {
            screenId: entry.screenId,
        }));
        await this.enqueueSliceJobIfNeeded(saved);
        return saved;
    }
    async delete(id, organisationId) {
        const entry = await this.findOneOrFail(id, organisationId);
        const screenId = entry.screenId;
        await this.scheduleEntryRepository.remove(entry);
        if (screenId) {
            this.emitScheduleChanged(screenId, organisationId);
        }
        this.eventEmitter.emit(audit_events_1.AUDIT_SCHEDULE_DELETED, new audit_events_1.AuditScheduleEvent(id, organisationId, null, { screenId }));
    }
    async findByScreen(screenId, organisationId, _from, _to) {
        return this.scheduleEntryRepository.find({
            where: {
                screenId,
                organisationId,
            },
            relations: ['playlist'],
            order: { startTime: 'ASC' },
        });
    }
    async findByOrganisation(organisationId, _from, _to) {
        return this.scheduleEntryRepository.find({
            where: {
                organisationId,
            },
            relations: ['playlist', 'screen', 'group'],
            order: { startTime: 'ASC' },
        });
    }
    async getCurrentPlaylist(screenId) {
        const now = new Date();
        const entries = await this.scheduleEntryRepository.find({
            where: { screenId },
            relations: ['playlist'],
        });
        for (const entry of entries) {
            const occurrences = (0, rrule_util_1.getOccurrences)(entry.startTime, entry.endTime, entry.rrule, new Date(now.getTime() - 24 * 60 * 60 * 1000), new Date(now.getTime() + 24 * 60 * 60 * 1000));
            for (const occ of occurrences) {
                if (occ.start <= now && occ.end > now) {
                    return { playlist: entry.playlist, isDefault: false };
                }
            }
        }
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
                const occurrences = (0, rrule_util_1.getOccurrences)(entry.startTime, entry.endTime, entry.rrule, new Date(now.getTime() - 24 * 60 * 60 * 1000), new Date(now.getTime() + 24 * 60 * 60 * 1000));
                for (const occ of occurrences) {
                    if (occ.start <= now && occ.end > now) {
                        return { playlist: entry.playlist, isDefault: false };
                    }
                }
            }
        }
        return this.getFallbackPlaylist(screen.organisationId);
    }
    async checkOverlap(screenId, organisationId, startTime, endTime, rrule, excludeEntryId) {
        const windowStart = new Date(Math.min(startTime.getTime(), Date.now()));
        const windowEnd = new Date(windowStart.getTime() + OVERLAP_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const newOccurrences = (0, rrule_util_1.getOccurrences)(startTime, endTime, rrule, windowStart, windowEnd);
        const existingEntries = await this.scheduleEntryRepository.find({
            where: { screenId, organisationId },
        });
        for (const existing of existingEntries) {
            if (excludeEntryId && existing.id === excludeEntryId)
                continue;
            const existingOccurrences = (0, rrule_util_1.getOccurrences)(existing.startTime, existing.endTime, existing.rrule, windowStart, windowEnd);
            if (this.rangesOverlap(newOccurrences, existingOccurrences)) {
                throw new common_1.ConflictException('Schedule entry overlaps with an existing entry on this screen');
            }
        }
    }
    rangesOverlap(rangesA, rangesB) {
        for (const a of rangesA) {
            for (const b of rangesB) {
                if (a.start < b.end && a.end > b.start) {
                    return true;
                }
            }
        }
        return false;
    }
    async findOneOrFail(id, organisationId) {
        const entry = await this.scheduleEntryRepository.findOne({
            where: { id, organisationId },
            relations: ['playlist'],
        });
        if (!entry) {
            throw new common_1.NotFoundException(`Schedule entry with id "${id}" not found in organisation "${organisationId}"`);
        }
        return entry;
    }
    validateTarget(screenId, groupId) {
        if (screenId && groupId) {
            throw new common_1.BadRequestException('Exactly one of screenId or groupId must be set, not both');
        }
        if (!screenId && !groupId) {
            throw new common_1.BadRequestException('Exactly one of screenId or groupId must be set');
        }
    }
    async validateGroup(groupId, organisationId) {
        const group = await this.screenGroupRepository.findOne({
            where: { id: groupId, organisationId },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Screen group with id "${groupId}" not found in organisation "${organisationId}"`);
        }
    }
    async validateScreen(screenId, organisationId) {
        const screen = await this.screenRepository.findOne({
            where: { id: screenId, organisationId },
        });
        if (!screen) {
            throw new common_1.NotFoundException(`Screen with id "${screenId}" not found in organisation "${organisationId}"`);
        }
    }
    async validatePlaylist(playlistId, organisationId) {
        const playlist = await this.playlistRepository.findOne({
            where: { id: playlistId, organisationId },
        });
        if (!playlist) {
            throw new common_1.NotFoundException(`Playlist with id "${playlistId}" not found in organisation "${organisationId}"`);
        }
    }
    async getFallbackPlaylist(organisationId) {
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
    emitScheduleChanged(screenId, organisationId) {
        this.eventEmitter.emit(schedule_event_1.SCHEDULE_ENTRY_CHANGED, new schedule_event_1.ScheduleEntryChangedEvent(screenId, organisationId));
    }
    emitGroupScheduleChanged(groupId, organisationId, playlistId) {
        this.eventEmitter.emit(schedule_event_1.GROUP_SCHEDULE_CHANGED, new schedule_event_1.GroupScheduleChangedEvent(groupId, organisationId, playlistId));
    }
    async enqueueSliceJobIfNeeded(entry) {
        if (!entry.groupId)
            return;
        const group = await this.screenGroupRepository.findOne({
            where: { id: entry.groupId },
        });
        if (!group || group.mode !== screen_group_mode_enum_1.ScreenGroupMode.Split)
            return;
        await this.sliceContentQueue.add('slice', {
            groupId: entry.groupId,
            scheduleId: entry.id,
            playlistId: entry.playlistId,
            organisationId: entry.organisationId,
        });
    }
};
exports.ScheduleService = ScheduleService;
exports.ScheduleService = ScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(schedule_entry_entity_1.ScheduleEntry)),
    __param(1, (0, typeorm_1.InjectRepository)(organisation_entity_1.Organisation)),
    __param(2, (0, typeorm_1.InjectRepository)(screen_entity_1.Screen)),
    __param(3, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __param(4, (0, typeorm_1.InjectRepository)(screen_group_entity_1.ScreenGroup)),
    __param(5, (0, bullmq_1.InjectQueue)(slice_content_1.SLICE_CONTENT_QUEUE)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        bullmq_2.Queue,
        event_emitter_1.EventEmitter2])
], ScheduleService);
//# sourceMappingURL=schedule.service.js.map