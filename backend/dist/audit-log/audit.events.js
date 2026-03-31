"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditGroupEvent = exports.AUDIT_GROUP_MODE_CHANGED = exports.AUDIT_GROUP_SCREEN_REMOVED = exports.AUDIT_GROUP_SCREEN_ADDED = exports.AUDIT_GROUP_DELETED = exports.AUDIT_GROUP_UPDATED = exports.AUDIT_GROUP_CREATED = exports.AuditOrganisationEvent = exports.AUDIT_ORGANISATION_UPDATED = exports.AUDIT_ORGANISATION_CREATED = exports.AuditUserEvent = exports.AUDIT_USER_REMOVED = exports.AUDIT_USER_ROLE_CHANGED = exports.AUDIT_USER_INVITED = exports.AuditScreenEvent = exports.AUDIT_SCREEN_OFFLINE = exports.AUDIT_SCREEN_ONLINE = exports.AUDIT_SCREEN_KEY_REGENERATED = exports.AUDIT_SCREEN_UPDATED = exports.AUDIT_SCREEN_REGISTERED = exports.AuditScheduleEvent = exports.AUDIT_SCHEDULE_DELETED = exports.AUDIT_SCHEDULE_UPDATED = exports.AUDIT_SCHEDULE_CREATED = exports.AuditPlaylistEvent = exports.AUDIT_PLAYLIST_DELETED = exports.AUDIT_PLAYLIST_UPDATED = exports.AUDIT_PLAYLIST_CREATED = exports.AuditContentEvent = exports.AUDIT_CONTENT_REUPLOADED = exports.AUDIT_CONTENT_DELETED = exports.AUDIT_CONTENT_UPLOADED = void 0;
exports.AUDIT_CONTENT_UPLOADED = 'audit.content.uploaded';
exports.AUDIT_CONTENT_DELETED = 'audit.content.deleted';
exports.AUDIT_CONTENT_REUPLOADED = 'audit.content.reuploaded';
class AuditContentEvent {
    contentId;
    organisationId;
    userId;
    details;
    constructor(contentId, organisationId, userId, details) {
        this.contentId = contentId;
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditContentEvent = AuditContentEvent;
exports.AUDIT_PLAYLIST_CREATED = 'audit.playlist.created';
exports.AUDIT_PLAYLIST_UPDATED = 'audit.playlist.updated';
exports.AUDIT_PLAYLIST_DELETED = 'audit.playlist.deleted';
class AuditPlaylistEvent {
    playlistId;
    organisationId;
    userId;
    details;
    constructor(playlistId, organisationId, userId, details) {
        this.playlistId = playlistId;
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditPlaylistEvent = AuditPlaylistEvent;
exports.AUDIT_SCHEDULE_CREATED = 'audit.schedule.created';
exports.AUDIT_SCHEDULE_UPDATED = 'audit.schedule.updated';
exports.AUDIT_SCHEDULE_DELETED = 'audit.schedule.deleted';
class AuditScheduleEvent {
    scheduleEntryId;
    organisationId;
    userId;
    details;
    constructor(scheduleEntryId, organisationId, userId, details) {
        this.scheduleEntryId = scheduleEntryId;
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditScheduleEvent = AuditScheduleEvent;
exports.AUDIT_SCREEN_REGISTERED = 'audit.screen.registered';
exports.AUDIT_SCREEN_UPDATED = 'audit.screen.updated';
exports.AUDIT_SCREEN_KEY_REGENERATED = 'audit.screen.key_regenerated';
exports.AUDIT_SCREEN_ONLINE = 'audit.screen.online';
exports.AUDIT_SCREEN_OFFLINE = 'audit.screen.offline';
class AuditScreenEvent {
    screenId;
    organisationId;
    userId;
    details;
    constructor(screenId, organisationId, userId, details) {
        this.screenId = screenId;
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditScreenEvent = AuditScreenEvent;
exports.AUDIT_USER_INVITED = 'audit.user.invited';
exports.AUDIT_USER_ROLE_CHANGED = 'audit.user.role_changed';
exports.AUDIT_USER_REMOVED = 'audit.user.removed';
class AuditUserEvent {
    targetUserId;
    organisationId;
    userId;
    details;
    constructor(targetUserId, organisationId, userId, details) {
        this.targetUserId = targetUserId;
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditUserEvent = AuditUserEvent;
exports.AUDIT_ORGANISATION_CREATED = 'audit.organisation.created';
exports.AUDIT_ORGANISATION_UPDATED = 'audit.organisation.updated';
class AuditOrganisationEvent {
    organisationId;
    userId;
    details;
    constructor(organisationId, userId, details) {
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditOrganisationEvent = AuditOrganisationEvent;
exports.AUDIT_GROUP_CREATED = 'audit.group.created';
exports.AUDIT_GROUP_UPDATED = 'audit.group.updated';
exports.AUDIT_GROUP_DELETED = 'audit.group.deleted';
exports.AUDIT_GROUP_SCREEN_ADDED = 'audit.group.screen_added';
exports.AUDIT_GROUP_SCREEN_REMOVED = 'audit.group.screen_removed';
exports.AUDIT_GROUP_MODE_CHANGED = 'audit.group.mode_changed';
class AuditGroupEvent {
    groupId;
    organisationId;
    userId;
    details;
    constructor(groupId, organisationId, userId, details) {
        this.groupId = groupId;
        this.organisationId = organisationId;
        this.userId = userId;
        this.details = details;
    }
}
exports.AuditGroupEvent = AuditGroupEvent;
//# sourceMappingURL=audit.events.js.map