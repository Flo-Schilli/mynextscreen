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
var ScreenProtocolService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenProtocolService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const screen_event_model_1 = require("./screen-event.model");
const screen_event_type_enum_1 = require("./screen-event-type.enum");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const screen_group_mode_enum_1 = require("../screen-group/screen-group-mode.enum");
const screen_entity_1 = require("../screen/screen.entity");
const sliced_rendition_entity_1 = require("../slice-content/sliced-rendition.entity");
const screen_state_service_1 = require("../screen/screen-state.service");
const schedule_event_1 = require("../schedule/schedule.event");
const screen_state_event_1 = require("../screen/screen-state.event");
const schedule_service_1 = require("../schedule/schedule.service");
let ScreenProtocolService = ScreenProtocolService_1 = class ScreenProtocolService {
    screenGroupRepository;
    screenRepository;
    slicedRenditionRepository;
    screenStateService;
    scheduleService;
    logger = new common_1.Logger(ScreenProtocolService_1.name);
    constructor(screenGroupRepository, screenRepository, slicedRenditionRepository, screenStateService, scheduleService) {
        this.screenGroupRepository = screenGroupRepository;
        this.screenRepository = screenRepository;
        this.slicedRenditionRepository = slicedRenditionRepository;
        this.screenStateService = screenStateService;
        this.scheduleService = scheduleService;
    }
    async handleGroupScheduleChanged(event) {
        const group = await this.screenGroupRepository.findOne({
            where: { id: event.groupId, organisationId: event.organisationId },
            relations: ['screens'],
        });
        if (!group || !group.screens || group.screens.length === 0) {
            return;
        }
        const syncToken = Date.now().toString();
        let currentPlaylist = null;
        try {
            const result = await this.scheduleService.getCurrentPlaylist(group.screens[0].id);
            currentPlaylist = result.playlist
                ? { id: result.playlist.id, name: result.playlist.name }
                : null;
        }
        catch {
            this.logger.warn(`Failed to resolve playlist for group ${event.groupId}`);
        }
        if (group.mode === screen_group_mode_enum_1.ScreenGroupMode.Mirror) {
            await this.fanOutMirror(group, currentPlaylist, syncToken, event.organisationId);
        }
        else {
            await this.fanOutSplit(group, currentPlaylist, syncToken, event.organisationId);
        }
    }
    async handleGroupLiveStreamStarted(event) {
        const screen = await this.screenRepository.findOne({
            where: { id: event.screenId },
        });
        if (!screen?.groupId)
            return;
        const group = await this.screenGroupRepository.findOne({
            where: { id: screen.groupId },
            relations: ['screens'],
        });
        if (!group || !group.screens || group.screens.length === 0)
            return;
        const syncToken = Date.now().toString();
        const payload = {
            type: 'live_stream',
            screenId: event.screenId,
            organisationId: event.organisationId,
            groupId: group.id,
            syncToken,
        };
        const events = group.screens.map((s) => this.screenStateService.pushEvent(s.id, new screen_event_model_1.ScreenEvent(screen_event_type_enum_1.ScreenEventType.LiveStreamStart, {
            ...payload,
            screenId: s.id,
        })));
        await Promise.all(events.map((e) => Promise.resolve(e)));
    }
    async triggerGroupPlay(groupId, organisationId, contentUrl, contentItemId, isLiveStream) {
        const group = await this.screenGroupRepository.findOne({
            where: { id: groupId, organisationId },
            relations: ['screens'],
        });
        if (!group || !group.screens || group.screens.length === 0)
            return;
        const syncToken = Date.now().toString();
        if (isLiveStream || group.mode === screen_group_mode_enum_1.ScreenGroupMode.Mirror) {
            const pushes = group.screens.map((screen) => Promise.resolve(this.screenStateService.pushEvent(screen.id, new screen_event_model_1.ScreenEvent(screen_event_type_enum_1.ScreenEventType.GroupPlay, {
                contentUrl,
                contentItemId,
                groupId: group.id,
                syncToken,
                screenId: screen.id,
                organisationId,
            }))));
            await Promise.all(pushes);
        }
        else {
            await this.fanOutSplitPlay(group, contentUrl, contentItemId, syncToken, organisationId);
        }
    }
    async fanOutMirror(group, currentPlaylist, syncToken, organisationId) {
        const pushes = group.screens.map((screen) => Promise.resolve(this.screenStateService.pushEvent(screen.id, new screen_event_model_1.ScreenEvent(screen_event_type_enum_1.ScreenEventType.ScheduleUpdate, {
            screenId: screen.id,
            organisationId,
            currentPlaylist,
            isDefault: false,
            groupId: group.id,
            syncToken,
        }))));
        await Promise.all(pushes);
    }
    async fanOutSplit(group, currentPlaylist, syncToken, organisationId) {
        const pushes = group.screens.map((screen) => Promise.resolve(this.screenStateService.pushEvent(screen.id, new screen_event_model_1.ScreenEvent(screen_event_type_enum_1.ScreenEventType.ScheduleUpdate, {
            screenId: screen.id,
            organisationId,
            currentPlaylist,
            isDefault: false,
            groupId: group.id,
            syncToken,
        }))));
        await Promise.all(pushes);
    }
    async fanOutSplitPlay(group, contentUrl, contentItemId, syncToken, organisationId) {
        const pushes = group.screens.map(async (screen) => {
            const rendition = await this.slicedRenditionRepository.findOne({
                where: {
                    groupId: group.id,
                    screenId: screen.id,
                    contentItemId,
                },
            });
            if (rendition) {
                this.screenStateService.pushEvent(screen.id, new screen_event_model_1.ScreenEvent(screen_event_type_enum_1.ScreenEventType.GroupPlay, {
                    contentUrl: `/api/media/slices/${group.id}/${screen.id}/${contentItemId}`,
                    contentItemId,
                    groupId: group.id,
                    syncToken,
                    screenId: screen.id,
                    organisationId,
                }));
            }
            else {
                this.screenStateService.pushEvent(screen.id, new screen_event_model_1.ScreenEvent(screen_event_type_enum_1.ScreenEventType.Pending, {
                    contentItemId,
                    groupId: group.id,
                    syncToken,
                    screenId: screen.id,
                    organisationId,
                    reason: 'Sliced rendition not yet available',
                }));
            }
        });
        await Promise.all(pushes);
    }
};
exports.ScreenProtocolService = ScreenProtocolService;
__decorate([
    (0, event_emitter_1.OnEvent)(schedule_event_1.GROUP_SCHEDULE_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_event_1.GroupScheduleChangedEvent]),
    __metadata("design:returntype", Promise)
], ScreenProtocolService.prototype, "handleGroupScheduleChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_state_event_1.LIVE_STREAM_STARTED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_state_event_1.ScreenStateChangeEvent]),
    __metadata("design:returntype", Promise)
], ScreenProtocolService.prototype, "handleGroupLiveStreamStarted", null);
exports.ScreenProtocolService = ScreenProtocolService = ScreenProtocolService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(screen_group_entity_1.ScreenGroup)),
    __param(1, (0, typeorm_1.InjectRepository)(screen_entity_1.Screen)),
    __param(2, (0, typeorm_1.InjectRepository)(sliced_rendition_entity_1.SlicedRendition)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        screen_state_service_1.ScreenStateService,
        schedule_service_1.ScheduleService])
], ScreenProtocolService);
//# sourceMappingURL=screen-protocol.service.js.map