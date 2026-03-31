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
exports.ScreenGroupService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const organisation_scope_service_1 = require("../organisation/organisation-scope.service");
const screen_group_entity_1 = require("./screen-group.entity");
const screen_group_mode_enum_1 = require("./screen-group-mode.enum");
const screen_entity_1 = require("../screen/screen.entity");
const audit_events_1 = require("../audit-log/audit.events");
let ScreenGroupService = class ScreenGroupService extends organisation_scope_service_1.OrganisationScopedService {
    screenRepository;
    eventEmitter;
    constructor(repository, screenRepository, eventEmitter) {
        super(repository, 'ScreenGroup');
        this.screenRepository = screenRepository;
        this.eventEmitter = eventEmitter;
    }
    async findAll(organisationId) {
        return this.repository.find({
            where: { organisationId },
            relations: ['screens'],
        });
    }
    async findOne(organisationId, id) {
        const entity = await this.repository.findOne({
            where: { organisationId, id },
            relations: ['screens'],
        });
        if (!entity) {
            throw new common_1.NotFoundException(`ScreenGroup with id "${id}" not found in organisation "${organisationId}"`);
        }
        return entity;
    }
    async createGroup(organisationId, dto, userId = null) {
        if (dto.mode === screen_group_mode_enum_1.ScreenGroupMode.Split) {
            if (!dto.gridColumns || !dto.gridRows) {
                throw new common_1.BadRequestException('gridColumns and gridRows are required when mode is split');
            }
        }
        const group = await this.create(organisationId, {
            name: dto.name,
            mode: dto.mode,
            gridColumns: dto.mode === screen_group_mode_enum_1.ScreenGroupMode.Split ? dto.gridColumns : null,
            gridRows: dto.mode === screen_group_mode_enum_1.ScreenGroupMode.Split ? dto.gridRows : null,
        });
        this.eventEmitter.emit(audit_events_1.AUDIT_GROUP_CREATED, new audit_events_1.AuditGroupEvent(group.id, organisationId, userId, {
            name: group.name,
            mode: group.mode,
            gridColumns: group.gridColumns,
            gridRows: group.gridRows,
        }));
        return group;
    }
    async updateGroup(organisationId, id, dto, userId = null) {
        const group = await this.findOne(organisationId, id);
        const previousMode = group.mode;
        const effectiveMode = dto.mode ?? group.mode;
        if (effectiveMode === screen_group_mode_enum_1.ScreenGroupMode.Split) {
            const effectiveColumns = dto.gridColumns ?? group.gridColumns;
            const effectiveRows = dto.gridRows ?? group.gridRows;
            if (!effectiveColumns || !effectiveRows) {
                throw new common_1.BadRequestException('gridColumns and gridRows are required when mode is split');
            }
        }
        if (dto.name !== undefined)
            group.name = dto.name;
        if (dto.mode !== undefined)
            group.mode = dto.mode;
        if (effectiveMode === screen_group_mode_enum_1.ScreenGroupMode.Mirror) {
            group.gridColumns = null;
            group.gridRows = null;
        }
        else {
            if (dto.gridColumns !== undefined)
                group.gridColumns = dto.gridColumns;
            if (dto.gridRows !== undefined)
                group.gridRows = dto.gridRows;
        }
        const saved = await this.repository.save(group);
        if (dto.mode !== undefined && dto.mode !== previousMode) {
            this.eventEmitter.emit(audit_events_1.AUDIT_GROUP_MODE_CHANGED, new audit_events_1.AuditGroupEvent(saved.id, organisationId, userId, {
                previousMode,
                newMode: dto.mode,
            }));
        }
        this.eventEmitter.emit(audit_events_1.AUDIT_GROUP_UPDATED, new audit_events_1.AuditGroupEvent(saved.id, organisationId, userId, {
            name: saved.name,
            mode: saved.mode,
            gridColumns: saved.gridColumns,
            gridRows: saved.gridRows,
        }));
        return saved;
    }
    async removeGroup(organisationId, id, userId = null) {
        const group = await this.findOne(organisationId, id);
        const memberCount = await this.screenRepository.count({
            where: { groupId: group.id },
        });
        if (memberCount > 0) {
            throw new common_1.ConflictException(`Cannot delete screen group "${group.name}" because it still has ${memberCount} assigned screen(s). Remove all screens from the group before deleting it.`);
        }
        const groupId = group.id;
        const groupName = group.name;
        await this.repository.remove(group);
        this.eventEmitter.emit(audit_events_1.AUDIT_GROUP_DELETED, new audit_events_1.AuditGroupEvent(groupId, organisationId, userId, {
            name: groupName,
        }));
    }
    async assignScreen(organisationId, groupId, screenId, dto, userId = null) {
        const group = await this.findOne(organisationId, groupId);
        const screen = await this.screenRepository.findOne({
            where: { id: screenId, organisationId },
        });
        if (!screen) {
            throw new common_1.NotFoundException(`Screen with id "${screenId}" not found in organisation "${organisationId}"`);
        }
        if (screen.groupId && screen.groupId !== groupId) {
            throw new common_1.ConflictException(`Screen "${screen.name}" already belongs to another group`);
        }
        if (group.mode === screen_group_mode_enum_1.ScreenGroupMode.Split) {
            if (dto.gridRow === undefined || dto.gridColumn === undefined) {
                throw new common_1.BadRequestException('gridRow and gridColumn are required when assigning to a split-mode group');
            }
            const cellOccupied = await this.screenRepository.findOne({
                where: {
                    groupId,
                    gridRow: dto.gridRow,
                    gridColumn: dto.gridColumn,
                },
            });
            if (cellOccupied && cellOccupied.id !== screenId) {
                throw new common_1.ConflictException(`Grid cell (${dto.gridRow}, ${dto.gridColumn}) is already occupied by screen "${cellOccupied.name}"`);
            }
        }
        screen.groupId = groupId;
        screen.gridRow = group.mode === screen_group_mode_enum_1.ScreenGroupMode.Split ? (dto.gridRow ?? null) : null;
        screen.gridColumn = group.mode === screen_group_mode_enum_1.ScreenGroupMode.Split ? (dto.gridColumn ?? null) : null;
        const saved = await this.screenRepository.save(screen);
        this.eventEmitter.emit(audit_events_1.AUDIT_GROUP_SCREEN_ADDED, new audit_events_1.AuditGroupEvent(groupId, organisationId, userId, {
            screenId,
            screenName: saved.name,
            gridRow: saved.gridRow,
            gridColumn: saved.gridColumn,
        }));
        return saved;
    }
    async removeScreen(organisationId, groupId, screenId, userId = null) {
        await this.findOne(organisationId, groupId);
        const screen = await this.screenRepository.findOne({
            where: { id: screenId, organisationId, groupId },
        });
        if (!screen) {
            throw new common_1.NotFoundException(`Screen with id "${screenId}" not found in group "${groupId}"`);
        }
        const screenName = screen.name;
        screen.groupId = null;
        screen.gridRow = null;
        screen.gridColumn = null;
        const saved = await this.screenRepository.save(screen);
        this.eventEmitter.emit(audit_events_1.AUDIT_GROUP_SCREEN_REMOVED, new audit_events_1.AuditGroupEvent(groupId, organisationId, userId, {
            screenId,
            screenName,
        }));
        return saved;
    }
};
exports.ScreenGroupService = ScreenGroupService;
exports.ScreenGroupService = ScreenGroupService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(screen_group_entity_1.ScreenGroup)),
    __param(1, (0, typeorm_1.InjectRepository)(screen_entity_1.Screen)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], ScreenGroupService);
//# sourceMappingURL=screen-group.service.js.map