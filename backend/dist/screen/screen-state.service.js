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
var ScreenStateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenStateService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const rxjs_1 = require("rxjs");
const screen_service_1 = require("./screen.service");
const screen_protocol_1 = require("../screen-protocol");
const screen_state_event_1 = require("./screen-state.event");
const schedule_1 = require("../schedule");
let ScreenStateService = ScreenStateService_1 = class ScreenStateService {
    screenService;
    protocolAdapter;
    scheduleService;
    logger = new common_1.Logger(ScreenStateService_1.name);
    connections = new Map();
    constructor(screenService, protocolAdapter, scheduleService) {
        this.screenService = screenService;
        this.protocolAdapter = protocolAdapter;
        this.scheduleService = scheduleService;
    }
    onModuleDestroy() {
        for (const [screenId, { events, close }] of this.connections) {
            close.next();
            close.complete();
            events.complete();
            this.connections.delete(screenId);
        }
    }
    async assembleState(organisationId, screenId) {
        const screen = await this.screenService.findOne(organisationId, screenId);
        const screenInfo = {
            id: screen.id,
            name: screen.name,
            organisationId: screen.organisationId,
            resolution: screen.resolution,
            location: screen.location,
        };
        return new screen_protocol_1.ScreenState(screenInfo, null, [], null, null);
    }
    async getRenderedState(organisationId, screenId) {
        const state = await this.assembleState(organisationId, screenId);
        return this.protocolAdapter.renderState(state);
    }
    subscribe(screenId) {
        let conn = this.connections.get(screenId);
        if (!conn) {
            conn = { events: new rxjs_1.Subject(), close: new rxjs_1.Subject() };
            this.connections.set(screenId, conn);
        }
        const { events, close } = conn;
        const keepalive$ = (0, rxjs_1.interval)(30_000).pipe((0, rxjs_1.takeUntil)(close), (0, rxjs_1.map)(() => ({
            data: '',
            type: 'keepalive',
        })));
        const events$ = events.pipe((0, rxjs_1.map)((event) => ({
            data: this.protocolAdapter.renderEvent(event),
            type: 'state-change',
        })));
        return (0, rxjs_1.merge)(events$, keepalive$).pipe((0, rxjs_1.finalize)(() => {
            const current = this.connections.get(screenId);
            if (current && current.events === events && !events.observed) {
                this.connections.delete(screenId);
                this.logger.log(`SSE connection closed for screen ${screenId}`);
            }
        }));
    }
    pushEvent(screenId, event) {
        const conn = this.connections.get(screenId);
        if (conn) {
            conn.events.next(event);
        }
    }
    async handleScheduleEntryChanged(event) {
        const conn = this.connections.get(event.screenId);
        if (!conn)
            return;
        let currentPlaylist = null;
        let isDefault = true;
        try {
            const result = await this.scheduleService.getCurrentPlaylist(event.screenId);
            isDefault = result.isDefault;
            currentPlaylist = result.playlist
                ? { id: result.playlist.id, name: result.playlist.name }
                : null;
        }
        catch (error) {
            this.logger.warn(`Failed to resolve current playlist for screen ${event.screenId}: ${error}`);
        }
        this.pushEvent(event.screenId, new screen_protocol_1.ScreenEvent(screen_protocol_1.ScreenEventType.ScheduleUpdate, {
            screenId: event.screenId,
            organisationId: event.organisationId,
            currentPlaylist,
            isDefault,
        }));
    }
    handleScheduleChanged(event) {
        this.pushEvent(event.screenId, new screen_protocol_1.ScreenEvent(screen_protocol_1.ScreenEventType.ScheduleUpdate, {
            screenId: event.screenId,
            organisationId: event.organisationId,
        }));
    }
    handlePlaylistChanged(event) {
        this.pushEvent(event.screenId, new screen_protocol_1.ScreenEvent(screen_protocol_1.ScreenEventType.PlaylistUpdate, {
            screenId: event.screenId,
            organisationId: event.organisationId,
        }));
    }
    handleContentChanged(event) {
        this.pushEvent(event.screenId, new screen_protocol_1.ScreenEvent(screen_protocol_1.ScreenEventType.ContentUpdate, {
            screenId: event.screenId,
            organisationId: event.organisationId,
        }));
    }
    handleLiveStreamStarted(event) {
        this.pushEvent(event.screenId, new screen_protocol_1.ScreenEvent(screen_protocol_1.ScreenEventType.LiveStreamStart, {
            screenId: event.screenId,
            organisationId: event.organisationId,
        }));
    }
    handleLiveStreamStopped(event) {
        this.pushEvent(event.screenId, new screen_protocol_1.ScreenEvent(screen_protocol_1.ScreenEventType.LiveStreamStop, {
            screenId: event.screenId,
            organisationId: event.organisationId,
        }));
    }
};
exports.ScreenStateService = ScreenStateService;
__decorate([
    (0, event_emitter_1.OnEvent)(schedule_1.SCHEDULE_ENTRY_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_1.ScheduleEntryChangedEvent]),
    __metadata("design:returntype", Promise)
], ScreenStateService.prototype, "handleScheduleEntryChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_state_event_1.SCHEDULE_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_state_event_1.ScreenStateChangeEvent]),
    __metadata("design:returntype", void 0)
], ScreenStateService.prototype, "handleScheduleChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_state_event_1.PLAYLIST_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_state_event_1.ScreenStateChangeEvent]),
    __metadata("design:returntype", void 0)
], ScreenStateService.prototype, "handlePlaylistChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_state_event_1.CONTENT_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_state_event_1.ScreenStateChangeEvent]),
    __metadata("design:returntype", void 0)
], ScreenStateService.prototype, "handleContentChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_state_event_1.LIVE_STREAM_STARTED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_state_event_1.ScreenStateChangeEvent]),
    __metadata("design:returntype", void 0)
], ScreenStateService.prototype, "handleLiveStreamStarted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_state_event_1.LIVE_STREAM_STOPPED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_state_event_1.ScreenStateChangeEvent]),
    __metadata("design:returntype", void 0)
], ScreenStateService.prototype, "handleLiveStreamStopped", null);
exports.ScreenStateService = ScreenStateService = ScreenStateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(screen_protocol_1.SCREEN_PROTOCOL_ADAPTER)),
    __metadata("design:paramtypes", [screen_service_1.ScreenService, Object, schedule_1.ScheduleService])
], ScreenStateService);
//# sourceMappingURL=screen-state.service.js.map