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
exports.PlaylistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_2 = require("typeorm");
const playlist_entity_1 = require("./playlist.entity");
const playlist_item_entity_1 = require("./playlist-item.entity");
const organisation_entity_1 = require("../organisation/organisation.entity");
const content_entity_1 = require("../content/content.entity");
const content_type_enum_1 = require("../content/content-type.enum");
const playlist_event_1 = require("./playlist.event");
const audit_events_1 = require("../audit-log/audit.events");
let PlaylistService = class PlaylistService {
    playlistRepository;
    playlistItemRepository;
    organisationRepository;
    contentRepository;
    eventEmitter;
    constructor(playlistRepository, playlistItemRepository, organisationRepository, contentRepository, eventEmitter) {
        this.playlistRepository = playlistRepository;
        this.playlistItemRepository = playlistItemRepository;
        this.organisationRepository = organisationRepository;
        this.contentRepository = contentRepository;
        this.eventEmitter = eventEmitter;
    }
    async create(organisationId, dto) {
        const playlist = this.playlistRepository.create({
            organisationId,
            name: dto.name,
        });
        const saved = await this.playlistRepository.save(playlist);
        this.emitPlaylistChanged(saved.id, organisationId);
        this.eventEmitter.emit(audit_events_1.AUDIT_PLAYLIST_CREATED, new audit_events_1.AuditPlaylistEvent(saved.id, organisationId, null, {
            name: dto.name,
        }));
        return saved;
    }
    async findAll(organisationId) {
        return this.playlistRepository.find({
            where: { organisationId },
            relations: ['items'],
            order: { createdAt: 'ASC' },
        });
    }
    async findOne(id, organisationId) {
        const playlist = await this.playlistRepository.findOne({
            where: { id, organisationId },
            relations: ['items', 'items.content'],
            order: { items: { position: 'ASC' } },
        });
        if (!playlist) {
            throw new common_1.NotFoundException(`Playlist with id "${id}" not found in organisation "${organisationId}"`);
        }
        return playlist;
    }
    async update(id, organisationId, dto) {
        const playlist = await this.findOne(id, organisationId);
        playlist.name = dto.name;
        const saved = await this.playlistRepository.save(playlist);
        this.emitPlaylistChanged(id, organisationId);
        this.eventEmitter.emit(audit_events_1.AUDIT_PLAYLIST_UPDATED, new audit_events_1.AuditPlaylistEvent(id, organisationId, null, { name: dto.name }));
        return saved;
    }
    async addItem(id, organisationId, dto) {
        const playlist = await this.findOne(id, organisationId);
        const content = await this.contentRepository.findOne({
            where: { id: dto.contentId, organisationId },
        });
        if (!content) {
            throw new common_1.BadRequestException(`Content with id "${dto.contentId}" not found in organisation "${organisationId}"`);
        }
        let position;
        if (dto.position !== undefined) {
            position = dto.position;
        }
        else {
            const maxItem = await this.playlistItemRepository
                .createQueryBuilder('item')
                .where('item.playlistId = :playlistId', { playlistId: id })
                .orderBy('item.position', 'DESC')
                .getOne();
            position = maxItem ? maxItem.position + 1 : 0;
        }
        const item = this.playlistItemRepository.create({
            playlistId: playlist.id,
            contentId: dto.contentId,
            durationSeconds: dto.durationSeconds,
            position,
        });
        const saved = await this.playlistItemRepository.save(item);
        this.emitPlaylistChanged(id, organisationId);
        return saved;
    }
    async removeItem(playlistId, itemId, organisationId) {
        await this.findOne(playlistId, organisationId);
        const item = await this.playlistItemRepository.findOne({
            where: { id: itemId, playlistId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Playlist item with id "${itemId}" not found in playlist "${playlistId}"`);
        }
        await this.playlistItemRepository.remove(item);
        this.emitPlaylistChanged(playlistId, organisationId);
    }
    async reorderItems(playlistId, organisationId, itemIds) {
        await this.findOne(playlistId, organisationId);
        const items = await this.playlistItemRepository.find({
            where: { playlistId },
        });
        const itemMap = new Map(items.map((item) => [item.id, item]));
        for (const itemId of itemIds) {
            if (!itemMap.has(itemId)) {
                throw new common_1.BadRequestException(`Item with id "${itemId}" does not belong to playlist "${playlistId}"`);
            }
        }
        if (itemIds.length !== items.length) {
            throw new common_1.BadRequestException(`Expected ${items.length} item IDs but received ${itemIds.length}`);
        }
        const updated = [];
        for (let i = 0; i < itemIds.length; i++) {
            const item = itemMap.get(itemIds[i]);
            item.position = i;
            updated.push(item);
        }
        const saved = await this.playlistItemRepository.save(updated);
        this.emitPlaylistChanged(playlistId, organisationId);
        return saved;
    }
    async delete(id, organisationId) {
        const playlist = await this.findOne(id, organisationId);
        const org = await this.organisationRepository.findOneBy({
            id: organisationId,
        });
        if (org && org.defaultPlaylistId === id) {
            org.defaultPlaylistId = null;
            await this.organisationRepository.save(org);
        }
        await this.playlistRepository.remove(playlist);
        this.emitPlaylistChanged(id, organisationId);
        this.eventEmitter.emit(audit_events_1.AUDIT_PLAYLIST_DELETED, new audit_events_1.AuditPlaylistEvent(id, organisationId, null, {
            name: playlist.name,
        }));
    }
    async getTotalDuration(id, organisationId) {
        const playlist = await this.findOne(id, organisationId);
        let total = 0;
        for (const item of playlist.items) {
            if (item.content && item.content.type === content_type_enum_1.ContentType.Video) {
                total += item.durationSeconds;
            }
            else {
                total += item.durationSeconds;
            }
        }
        return total;
    }
    emitPlaylistChanged(playlistId, organisationId) {
        this.eventEmitter.emit(playlist_event_1.PLAYLIST_UPDATED, new playlist_event_1.PlaylistUpdatedEvent(playlistId, organisationId));
    }
};
exports.PlaylistService = PlaylistService;
exports.PlaylistService = PlaylistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __param(1, (0, typeorm_1.InjectRepository)(playlist_item_entity_1.PlaylistItem)),
    __param(2, (0, typeorm_1.InjectRepository)(organisation_entity_1.Organisation)),
    __param(3, (0, typeorm_1.InjectRepository)(content_entity_1.Content)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], PlaylistService);
//# sourceMappingURL=playlist.service.js.map