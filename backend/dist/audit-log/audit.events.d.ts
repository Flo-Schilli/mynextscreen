export declare const AUDIT_CONTENT_UPLOADED = "audit.content.uploaded";
export declare const AUDIT_CONTENT_DELETED = "audit.content.deleted";
export declare const AUDIT_CONTENT_REUPLOADED = "audit.content.reuploaded";
export declare class AuditContentEvent {
    readonly contentId: string;
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(contentId: string, organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
export declare const AUDIT_PLAYLIST_CREATED = "audit.playlist.created";
export declare const AUDIT_PLAYLIST_UPDATED = "audit.playlist.updated";
export declare const AUDIT_PLAYLIST_DELETED = "audit.playlist.deleted";
export declare class AuditPlaylistEvent {
    readonly playlistId: string;
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(playlistId: string, organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
export declare const AUDIT_SCHEDULE_CREATED = "audit.schedule.created";
export declare const AUDIT_SCHEDULE_UPDATED = "audit.schedule.updated";
export declare const AUDIT_SCHEDULE_DELETED = "audit.schedule.deleted";
export declare class AuditScheduleEvent {
    readonly scheduleEntryId: string;
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(scheduleEntryId: string, organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
export declare const AUDIT_SCREEN_REGISTERED = "audit.screen.registered";
export declare const AUDIT_SCREEN_UPDATED = "audit.screen.updated";
export declare const AUDIT_SCREEN_KEY_REGENERATED = "audit.screen.key_regenerated";
export declare const AUDIT_SCREEN_ONLINE = "audit.screen.online";
export declare const AUDIT_SCREEN_OFFLINE = "audit.screen.offline";
export declare class AuditScreenEvent {
    readonly screenId: string;
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(screenId: string, organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
export declare const AUDIT_USER_INVITED = "audit.user.invited";
export declare const AUDIT_USER_ROLE_CHANGED = "audit.user.role_changed";
export declare const AUDIT_USER_REMOVED = "audit.user.removed";
export declare class AuditUserEvent {
    readonly targetUserId: string;
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(targetUserId: string, organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
export declare const AUDIT_ORGANISATION_CREATED = "audit.organisation.created";
export declare const AUDIT_ORGANISATION_UPDATED = "audit.organisation.updated";
export declare class AuditOrganisationEvent {
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
export declare const AUDIT_GROUP_CREATED = "audit.group.created";
export declare const AUDIT_GROUP_UPDATED = "audit.group.updated";
export declare const AUDIT_GROUP_DELETED = "audit.group.deleted";
export declare const AUDIT_GROUP_SCREEN_ADDED = "audit.group.screen_added";
export declare const AUDIT_GROUP_SCREEN_REMOVED = "audit.group.screen_removed";
export declare const AUDIT_GROUP_MODE_CHANGED = "audit.group.mode_changed";
export declare class AuditGroupEvent {
    readonly groupId: string;
    readonly organisationId: string;
    readonly userId: string | null;
    readonly details: Record<string, unknown> | null;
    constructor(groupId: string, organisationId: string, userId: string | null, details: Record<string, unknown> | null);
}
