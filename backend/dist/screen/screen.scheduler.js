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
var ScreenScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const screen_service_1 = require("./screen.service");
const screen_status_event_1 = require("./screen-status.event");
const audit_events_1 = require("../audit-log/audit.events");
let ScreenScheduler = ScreenScheduler_1 = class ScreenScheduler {
    screenService;
    eventEmitter;
    configService;
    logger = new common_1.Logger(ScreenScheduler_1.name);
    offlineThresholdMs;
    constructor(screenService, eventEmitter, configService) {
        this.screenService = screenService;
        this.eventEmitter = eventEmitter;
        this.configService = configService;
        this.offlineThresholdMs = this.configService.get('SCREEN_OFFLINE_THRESHOLD_MS', 120_000);
    }
    async detectOfflineScreens() {
        const offlineScreens = await this.screenService.detectOfflineScreens(this.offlineThresholdMs);
        for (const screen of offlineScreens) {
            this.eventEmitter.emit(screen_status_event_1.SCREEN_STATUS_CHANGED, new screen_status_event_1.ScreenStatusEvent(screen.id, screen.organisationId, false));
            this.eventEmitter.emit(audit_events_1.AUDIT_SCREEN_OFFLINE, new audit_events_1.AuditScreenEvent(screen.id, screen.organisationId, null, null));
        }
        if (offlineScreens.length > 0) {
            this.logger.log(`Marked ${offlineScreens.length} screen(s) as offline`);
        }
    }
};
exports.ScreenScheduler = ScreenScheduler;
__decorate([
    (0, schedule_1.Interval)(60_000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScreenScheduler.prototype, "detectOfflineScreens", null);
exports.ScreenScheduler = ScreenScheduler = ScreenScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [screen_service_1.ScreenService,
        event_emitter_1.EventEmitter2,
        config_1.ConfigService])
], ScreenScheduler);
//# sourceMappingURL=screen.scheduler.js.map