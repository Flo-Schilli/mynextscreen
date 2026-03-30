// Audit-specific event constants and payload classes.
// These events are emitted by domain services and consumed by AuditListener.

// ── Content ──────────────────────────────────────────────────────────────────
export const AUDIT_CONTENT_UPLOADED = 'audit.content.uploaded';
export const AUDIT_CONTENT_DELETED = 'audit.content.deleted';
export const AUDIT_CONTENT_REUPLOADED = 'audit.content.reuploaded';
export const AUDIT_CONTENT_BULK_DELETED = 'audit.content.bulk_deleted';
export const AUDIT_CONTENT_BULK_TAGGED = 'audit.content.bulk_tagged';
export const AUDIT_CONTENT_BULK_UNTAGGED = 'audit.content.bulk_untagged';
export const AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST =
  'audit.content.bulk_added_to_playlist';

export class AuditContentEvent {
  constructor(
    public readonly contentId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Playlist ─────────────────────────────────────────────────────────────────
export const AUDIT_PLAYLIST_CREATED = 'audit.playlist.created';
export const AUDIT_PLAYLIST_UPDATED = 'audit.playlist.updated';
export const AUDIT_PLAYLIST_DELETED = 'audit.playlist.deleted';

export class AuditPlaylistEvent {
  constructor(
    public readonly playlistId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Schedule ─────────────────────────────────────────────────────────────────
export const AUDIT_SCHEDULE_CREATED = 'audit.schedule.created';
export const AUDIT_SCHEDULE_UPDATED = 'audit.schedule.updated';
export const AUDIT_SCHEDULE_DELETED = 'audit.schedule.deleted';

export class AuditScheduleEvent {
  constructor(
    public readonly scheduleEntryId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Screen ───────────────────────────────────────────────────────────────────
export const AUDIT_SCREEN_REGISTERED = 'audit.screen.registered';
export const AUDIT_SCREEN_UPDATED = 'audit.screen.updated';
export const AUDIT_SCREEN_KEY_REGENERATED = 'audit.screen.key_regenerated';
export const AUDIT_SCREEN_ONLINE = 'audit.screen.online';
export const AUDIT_SCREEN_OFFLINE = 'audit.screen.offline';
export const AUDIT_SCREEN_BULK_DELETED = 'audit.screen.bulk_deleted';
export const AUDIT_SCREEN_BULK_GROUP_ASSIGNED =
  'audit.screen.bulk_group_assigned';

export class AuditScreenEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── User / Membership ────────────────────────────────────────────────────────
export const AUDIT_USER_INVITED = 'audit.user.invited';
export const AUDIT_USER_ROLE_CHANGED = 'audit.user.role_changed';
export const AUDIT_USER_REMOVED = 'audit.user.removed';

export class AuditUserEvent {
  constructor(
    public readonly targetUserId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Organisation ─────────────────────────────────────────────────────────────
export const AUDIT_ORGANISATION_CREATED = 'audit.organisation.created';
export const AUDIT_ORGANISATION_UPDATED = 'audit.organisation.updated';

export class AuditOrganisationEvent {
  constructor(
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Live Stream ─────────────────────────────────────────────────────────────
export const AUDIT_LIVE_STREAM_CREATED = 'audit.live_stream.created';
export const AUDIT_LIVE_STREAM_UPDATED = 'audit.live_stream.updated';
export const AUDIT_LIVE_STREAM_DELETED = 'audit.live_stream.deleted';
export const AUDIT_LIVE_STREAM_ACTIVATED = 'audit.live_stream.activated';
export const AUDIT_LIVE_STREAM_DEACTIVATED = 'audit.live_stream.deactivated';
export const AUDIT_LIVE_STREAM_FAILED = 'audit.live_stream.failed';

export class AuditLiveStreamEvent {
  constructor(
    public readonly streamId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Screen Group ────────────────────────────────────────────────────────────
export const AUDIT_GROUP_CREATED = 'audit.group.created';
export const AUDIT_GROUP_UPDATED = 'audit.group.updated';
export const AUDIT_GROUP_DELETED = 'audit.group.deleted';
export const AUDIT_GROUP_SCREEN_ADDED = 'audit.group.screen_added';
export const AUDIT_GROUP_SCREEN_REMOVED = 'audit.group.screen_removed';
export const AUDIT_GROUP_MODE_CHANGED = 'audit.group.mode_changed';

export class AuditGroupEvent {
  constructor(
    public readonly groupId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}
