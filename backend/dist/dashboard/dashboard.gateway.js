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
var DashboardGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const websockets_1 = require("@nestjs/websockets");
const event_emitter_1 = require("@nestjs/event-emitter");
const socket_io_1 = require("socket.io");
const jose_1 = require("jose");
const transcoding_event_1 = require("../content/transcoding.event");
const screen_status_event_1 = require("../screen/screen-status.event");
const schedule_event_1 = require("../schedule/schedule.event");
let DashboardGateway = DashboardGateway_1 = class DashboardGateway {
    configService;
    logger = new common_1.Logger(DashboardGateway_1.name);
    jwks = null;
    hankoApiUrl;
    constructor(configService) {
        this.configService = configService;
        this.hankoApiUrl = this.configService.get('HANKO_API_URL', '');
    }
    server;
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ??
                client.handshake.query['token'];
            if (!token) {
                this.logger.warn('Connection rejected: no token provided');
                client.disconnect(true);
                return;
            }
            const jwks = this.getJwks();
            await (0, jose_1.jwtVerify)(token, jwks, { issuer: this.hankoApiUrl });
        }
        catch {
            this.logger.warn('Connection rejected: invalid JWT');
            client.disconnect(true);
            return;
        }
        const orgId = client.handshake.auth?.organisationId ??
            client.handshake.query['organisationId'];
        if (orgId) {
            client.join(`org:${orgId}`);
        }
    }
    handleDisconnect() {
    }
    getJwks() {
        if (!this.jwks) {
            const jwksUrl = new URL('/.well-known/jwks.json', this.hankoApiUrl);
            this.jwks = (0, jose_1.createRemoteJWKSet)(jwksUrl);
        }
        return this.jwks;
    }
    emitToOrg(organisationId, type, data) {
        const payload = {
            type,
            data,
            timestamp: new Date().toISOString(),
        };
        this.server.to(`org:${organisationId}`).emit(type, payload);
    }
    handleScreenStatusChanged(event) {
        const type = event.isOnline ? 'screen.online' : 'screen.offline';
        this.emitToOrg(event.organisationId, type, {
            screenId: event.screenId,
        });
    }
    handleTranscodingProgress(event) {
        this.emitToOrg(event.organisationId, 'transcoding.progress', {
            contentId: event.contentId,
            progress: event.progress,
        });
    }
    handleTranscodingCompleted(event) {
        this.emitToOrg(event.organisationId, 'transcoding.complete', {
            contentId: event.contentId,
            transcodedSizeBytes: event.transcodedSizeBytes,
        });
    }
    handleTranscodingFailed(event) {
        this.emitToOrg(event.organisationId, 'transcoding.failed', {
            contentId: event.contentId,
            error: event.error,
        });
    }
    handleScheduleChanged(event) {
        this.emitToOrg(event.organisationId, 'schedule.updated', {
            screenId: event.screenId,
        });
    }
};
exports.DashboardGateway = DashboardGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DashboardGateway.prototype, "server", void 0);
__decorate([
    (0, event_emitter_1.OnEvent)(screen_status_event_1.SCREEN_STATUS_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [screen_status_event_1.ScreenStatusEvent]),
    __metadata("design:returntype", void 0)
], DashboardGateway.prototype, "handleScreenStatusChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(transcoding_event_1.TRANSCODING_PROGRESS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transcoding_event_1.TranscodingProgressEvent]),
    __metadata("design:returntype", void 0)
], DashboardGateway.prototype, "handleTranscodingProgress", null);
__decorate([
    (0, event_emitter_1.OnEvent)(transcoding_event_1.TRANSCODING_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transcoding_event_1.TranscodingCompletedEvent]),
    __metadata("design:returntype", void 0)
], DashboardGateway.prototype, "handleTranscodingCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(transcoding_event_1.TRANSCODING_FAILED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transcoding_event_1.TranscodingFailedEvent]),
    __metadata("design:returntype", void 0)
], DashboardGateway.prototype, "handleTranscodingFailed", null);
__decorate([
    (0, event_emitter_1.OnEvent)(schedule_event_1.SCHEDULE_ENTRY_CHANGED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_event_1.ScheduleEntryChangedEvent]),
    __metadata("design:returntype", void 0)
], DashboardGateway.prototype, "handleScheduleChanged", null);
exports.DashboardGateway = DashboardGateway = DashboardGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/',
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DashboardGateway);
//# sourceMappingURL=dashboard.gateway.js.map