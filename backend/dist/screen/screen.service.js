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
exports.ScreenService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_2 = require("typeorm");
const organisation_scope_service_1 = require("../organisation/organisation-scope.service");
const screen_entity_1 = require("./screen.entity");
const api_key_util_1 = require("./api-key.util");
const screen_status_event_1 = require("./screen-status.event");
const audit_events_1 = require("../audit-log/audit.events");
let ScreenService = class ScreenService extends organisation_scope_service_1.OrganisationScopedService {
    eventEmitter;
    constructor(repository, eventEmitter) {
        super(repository, 'Screen');
        this.eventEmitter = eventEmitter;
    }
    async createScreen(organisationId, dto) {
        const apiKey = (0, api_key_util_1.generateApiKey)();
        const apiKeyHash = await (0, api_key_util_1.hashApiKey)(apiKey);
        const screen = await this.create(organisationId, {
            name: dto.name,
            resolution: dto.resolution,
            location: dto.location,
            apiKeyHash,
        });
        this.eventEmitter.emit(audit_events_1.AUDIT_SCREEN_REGISTERED, new audit_events_1.AuditScreenEvent(screen.id, organisationId, null, {
            name: dto.name,
        }));
        return { screen, apiKey };
    }
    async updateScreen(organisationId, id, dto) {
        const screen = await this.update(organisationId, id, dto);
        this.eventEmitter.emit(audit_events_1.AUDIT_SCREEN_UPDATED, new audit_events_1.AuditScreenEvent(id, organisationId, null, null));
        return screen;
    }
    async regenerateApiKey(organisationId, id) {
        const screen = await this.findOne(organisationId, id);
        const apiKey = (0, api_key_util_1.generateApiKey)();
        screen.apiKeyHash = await (0, api_key_util_1.hashApiKey)(apiKey);
        const saved = await this.repository.save(screen);
        this.eventEmitter.emit(audit_events_1.AUDIT_SCREEN_KEY_REGENERATED, new audit_events_1.AuditScreenEvent(id, organisationId, null, null));
        return { screen: saved, apiKey };
    }
    async recordHeartbeat(organisationId, id) {
        const screen = await this.findOne(organisationId, id);
        const wasOffline = !screen.isOnline;
        screen.lastHeartbeat = new Date();
        screen.isOnline = true;
        const saved = await this.repository.save(screen);
        if (wasOffline) {
            this.eventEmitter.emit(screen_status_event_1.SCREEN_STATUS_CHANGED, new screen_status_event_1.ScreenStatusEvent(saved.id, saved.organisationId, true));
            this.eventEmitter.emit(audit_events_1.AUDIT_SCREEN_ONLINE, new audit_events_1.AuditScreenEvent(saved.id, saved.organisationId, null, null));
        }
        return saved;
    }
    async detectOfflineScreens(thresholdMs) {
        const cutoff = new Date(Date.now() - thresholdMs);
        const staleScreens = await this.repository.find({
            where: {
                isOnline: true,
                lastHeartbeat: (0, typeorm_2.LessThan)(cutoff),
            },
        });
        if (staleScreens.length > 0) {
            await this.repository.update(staleScreens.map((s) => s.id), { isOnline: false });
        }
        return staleScreens;
    }
};
exports.ScreenService = ScreenService;
exports.ScreenService = ScreenService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(screen_entity_1.Screen)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], ScreenService);
//# sourceMappingURL=screen.service.js.map