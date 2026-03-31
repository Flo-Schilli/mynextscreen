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
var AuditListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const audit_log_service_1 = require("./audit-log.service");
const audit_action_enum_1 = require("./audit-action.enum");
const audit_events_1 = require("./audit.events");
let AuditListener = AuditListener_1 = class AuditListener {
    auditLogService;
    logger = new common_1.Logger(AuditListener_1.name);
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    handleContentUploaded(event) {
        this.record(audit_action_enum_1.AuditAction.ContentUpload, 'content', event.contentId, event.organisationId, event.userId, event.details);
    }
    handleContentDeleted(event) {
        this.record(audit_action_enum_1.AuditAction.ContentDelete, 'content', event.contentId, event.organisationId, event.userId, event.details);
    }
    handleContentReuploaded(event) {
        this.record(audit_action_enum_1.AuditAction.ContentReupload, 'content', event.contentId, event.organisationId, event.userId, event.details);
    }
    handlePlaylistCreated(event) {
        this.record(audit_action_enum_1.AuditAction.PlaylistCreate, 'playlist', event.playlistId, event.organisationId, event.userId, event.details);
    }
    handlePlaylistUpdated(event) {
        this.record(audit_action_enum_1.AuditAction.PlaylistUpdate, 'playlist', event.playlistId, event.organisationId, event.userId, event.details);
    }
    handlePlaylistDeleted(event) {
        this.record(audit_action_enum_1.AuditAction.PlaylistDelete, 'playlist', event.playlistId, event.organisationId, event.userId, event.details);
    }
    handleScheduleCreated(event) {
        this.record(audit_action_enum_1.AuditAction.ScheduleCreate, 'schedule', event.scheduleEntryId, event.organisationId, event.userId, event.details);
    }
    handleScheduleUpdated(event) {
        this.record(audit_action_enum_1.AuditAction.ScheduleUpdate, 'schedule', event.scheduleEntryId, event.organisationId, event.userId, event.details);
    }
    handleScheduleDeleted(event) {
        this.record(audit_action_enum_1.AuditAction.ScheduleDelete, 'schedule', event.scheduleEntryId, event.organisationId, event.userId, event.details);
    }
    handleScreenRegistered(event) {
        this.record(audit_action_enum_1.AuditAction.ScreenRegister, 'screen', event.screenId, event.organisationId, event.userId, event.details);
    }
    handleScreenUpdated(event) {
        this.record(audit_action_enum_1.AuditAction.ScreenUpdate, 'screen', event.screenId, event.organisationId, event.userId, event.details);
    }
    handleScreenKeyRegenerated(event) {
        this.record(audit_action_enum_1.AuditAction.ScreenKeyRegenerated, 'screen', event.screenId, event.organisationId, event.userId, event.details);
    }
    handleScreenOnline(event) {
        this.record(audit_action_enum_1.AuditAction.ScreenOnline, 'screen', event.screenId, event.organisationId, null, event.details);
    }
    handleScreenOffline(event) {
        this.record(audit_action_enum_1.AuditAction.ScreenOffline, 'screen', event.screenId, event.organisationId, null, event.details);
    }
    handleUserInvited(event) {
        this.record(audit_action_enum_1.AuditAction.UserInvited, 'user', event.targetUserId, event.organisationId, event.userId, event.details);
    }
    handleUserRoleChanged(event) {
        this.record(audit_action_enum_1.AuditAction.UserRoleChanged, 'user', event.targetUserId, event.organisationId, event.userId, event.details);
    }
    handleUserRemoved(event) {
        this.record(audit_action_enum_1.AuditAction.UserRemoved, 'user', event.targetUserId, event.organisationId, event.userId, event.details);
    }
    handleOrganisationCreated(event) {
        this.record(audit_action_enum_1.AuditAction.OrganisationCreated, 'organisation', event.organisationId, null, event.userId, event.details);
    }
    handleOrganisationUpdated(event) {
        this.record(audit_action_enum_1.AuditAction.OrganisationUpdated, 'organisation', event.organisationId, event.organisationId, event.userId, event.details);
    }
    handleGroupCreated(event) {
        this.record(audit_action_enum_1.AuditAction.GroupCreated, 'screen-group', event.groupId, event.organisationId, event.userId, event.details);
    }
    handleGroupUpdated(event) {
        this.record(audit_action_enum_1.AuditAction.GroupUpdated, 'screen-group', event.groupId, event.organisationId, event.userId, event.details);
    }
    handleGroupDeleted(event) {
        this.record(audit_action_enum_1.AuditAction.GroupDeleted, 'screen-group', event.groupId, event.organisationId, event.userId, event.details);
    }
    handleGroupScreenAdded(event) {
        this.record(audit_action_enum_1.AuditAction.GroupScreenAdded, 'screen-group', event.groupId, event.organisationId, event.userId, event.details);
    }
    handleGroupScreenRemoved(event) {
        this.record(audit_action_enum_1.AuditAction.GroupScreenRemoved, 'screen-group', event.groupId, event.organisationId, event.userId, event.details);
    }
    handleGroupModeChanged(event) {
        this.record(audit_action_enum_1.AuditAction.GroupModeChanged, 'screen-group', event.groupId, event.organisationId, event.userId, event.details);
    }
    record(action, resourceType, resourceId, organisationId, userId, details) {
        this.auditLogService
            .record({
            action,
            resourceType,
            resourceId,
            organisationId,
            userId,
            details,
            organisation: null,
        })
            .catch((err) => {
            this.logger.error(`Failed to record audit entry for ${action}: ${err.message}`, err.stack);
        });
    }
};
exports.AuditListener = AuditListener;
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_CONTENT_UPLOADED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditContentEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleContentUploaded", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_CONTENT_DELETED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditContentEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleContentDeleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_CONTENT_REUPLOADED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditContentEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleContentReuploaded", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_PLAYLIST_CREATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditPlaylistEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handlePlaylistCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_PLAYLIST_UPDATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditPlaylistEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handlePlaylistUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_PLAYLIST_DELETED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditPlaylistEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handlePlaylistDeleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCHEDULE_CREATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScheduleEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScheduleCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCHEDULE_UPDATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScheduleEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScheduleUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCHEDULE_DELETED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScheduleEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScheduleDeleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCREEN_REGISTERED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScreenEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScreenRegistered", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCREEN_UPDATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScreenEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScreenUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCREEN_KEY_REGENERATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScreenEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScreenKeyRegenerated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCREEN_ONLINE, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScreenEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScreenOnline", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_SCREEN_OFFLINE, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditScreenEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleScreenOffline", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_USER_INVITED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditUserEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleUserInvited", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_USER_ROLE_CHANGED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditUserEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleUserRoleChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_USER_REMOVED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditUserEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleUserRemoved", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_ORGANISATION_CREATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditOrganisationEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleOrganisationCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_ORGANISATION_UPDATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditOrganisationEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleOrganisationUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_GROUP_CREATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditGroupEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleGroupCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_GROUP_UPDATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditGroupEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleGroupUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_GROUP_DELETED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditGroupEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleGroupDeleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_GROUP_SCREEN_ADDED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditGroupEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleGroupScreenAdded", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_GROUP_SCREEN_REMOVED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditGroupEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleGroupScreenRemoved", null);
__decorate([
    (0, event_emitter_1.OnEvent)(audit_events_1.AUDIT_GROUP_MODE_CHANGED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_events_1.AuditGroupEvent]),
    __metadata("design:returntype", void 0)
], AuditListener.prototype, "handleGroupModeChanged", null);
exports.AuditListener = AuditListener = AuditListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], AuditListener);
//# sourceMappingURL=audit.listener.js.map