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
exports.OrganisationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_2 = require("typeorm");
const organisation_entity_1 = require("./organisation.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const audit_events_1 = require("../audit-log/audit.events");
let OrganisationService = class OrganisationService {
    organisationRepository;
    playlistRepository;
    eventEmitter;
    constructor(organisationRepository, playlistRepository, eventEmitter) {
        this.organisationRepository = organisationRepository;
        this.playlistRepository = playlistRepository;
        this.eventEmitter = eventEmitter;
    }
    async create(dto) {
        const organisation = this.organisationRepository.create(dto);
        const saved = await this.organisationRepository.save(organisation);
        this.eventEmitter.emit(audit_events_1.AUDIT_ORGANISATION_CREATED, new audit_events_1.AuditOrganisationEvent(saved.id, null, { name: dto.name }));
        return saved;
    }
    async findAll() {
        return this.organisationRepository.find();
    }
    async findOne(id) {
        const organisation = await this.organisationRepository.findOneBy({ id });
        if (!organisation) {
            throw new common_1.NotFoundException(`Organisation with id "${id}" not found`);
        }
        return organisation;
    }
    async update(id, dto) {
        const organisation = await this.findOne(id);
        Object.assign(organisation, dto);
        const saved = await this.organisationRepository.save(organisation);
        this.eventEmitter.emit(audit_events_1.AUDIT_ORGANISATION_UPDATED, new audit_events_1.AuditOrganisationEvent(id, null, null));
        return saved;
    }
    async setDefaultPlaylist(organisationId, playlistId) {
        const organisation = await this.findOne(organisationId);
        if (playlistId) {
            const playlist = await this.playlistRepository.findOne({
                where: { id: playlistId },
            });
            if (!playlist) {
                throw new common_1.NotFoundException(`Playlist with id "${playlistId}" not found`);
            }
            if (playlist.organisationId !== organisationId) {
                throw new common_1.BadRequestException('Playlist does not belong to this organisation');
            }
            organisation.defaultPlaylistId = playlistId;
        }
        else {
            organisation.defaultPlaylistId = null;
        }
        return this.organisationRepository.save(organisation);
    }
};
exports.OrganisationService = OrganisationService;
exports.OrganisationService = OrganisationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(organisation_entity_1.Organisation)),
    __param(1, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], OrganisationService);
//# sourceMappingURL=organisation.service.js.map