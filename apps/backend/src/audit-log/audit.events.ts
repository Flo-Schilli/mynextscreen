// Audit-specific event constants and payload classes.
// These events are emitted by domain services and consumed by AuditListener.

// ── Content ──────────────────────────────────────────────────────────────────
export const AUDIT_CONTENT_UPLOADED = 'audit.content.uploaded';
export const AUDIT_CONTENT_DELETED = 'audit.content.deleted';
export const AUDIT_CONTENT_REUPLOADED = 'audit.content.reuploaded';
export const AUDIT_CONTENT_BULK_DELETED = 'audit.content.bulk_deleted';
export const AUDIT_CONTENT_BULK_TAGGED = 'audit.content.bulk_tagged';
export const AUDIT_CONTENT_BULK_UNTAGGED = 'audit.content.bulk_untagged';
export const AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST = 'audit.content.bulk_added_to_playlist';

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
export const AUDIT_PLAYLIST_BULK_DELETED = 'audit.playlist.bulk_deleted';
export const AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED = 'audit.playlist.bulk_screen_assigned';

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
export const AUDIT_SCREEN_REFRESHED = 'audit.screen.refreshed';
export const AUDIT_SCREEN_ONLINE = 'audit.screen.online';
export const AUDIT_SCREEN_OFFLINE = 'audit.screen.offline';
export const AUDIT_SCREEN_BULK_DELETED = 'audit.screen.bulk_deleted';
export const AUDIT_SCREEN_BULK_GROUP_ASSIGNED = 'audit.screen.bulk_group_assigned';
export const AUDIT_SCREEN_PAIRING_FAILED = 'audit.screen.pairing_failed';

export class AuditScreenEvent {
  constructor(
    // null when the event has no concrete screen yet (e.g. a failed pairing
    // claim before the screen is created).
    public readonly screenId: string | null,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Site agents ──────────────────────────────────────────────────────────────
export const AUDIT_SITE_AGENT_CREATED = 'audit.site_agent.created';
export const AUDIT_SITE_AGENT_UPDATED = 'audit.site_agent.updated';
export const AUDIT_SITE_AGENT_DELETED = 'audit.site_agent.deleted';
export const AUDIT_SITE_AGENT_ENROLLED = 'audit.site_agent.enrolled';
export const AUDIT_SITE_AGENT_RESET = 'audit.site_agent.reset';
export const AUDIT_SITE_AGENT_REVOKED = 'audit.site_agent.revoked';
export const AUDIT_SITE_AGENT_ONLINE = 'audit.site_agent.online';
export const AUDIT_SITE_AGENT_OFFLINE = 'audit.site_agent.offline';

export class AuditSiteAgentEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly userId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

export const AUDIT_SCREEN_REMOTE_CONTROL_UPDATED = 'audit.screen.remote_control_updated';
export const AUDIT_SCREEN_REMOTE_CONTROL_REMOVED = 'audit.screen.remote_control_removed';
export const AUDIT_SCREEN_REMOTE_COMMAND = 'audit.screen.remote_command';
export const AUDIT_SCREEN_REMOTE_ONBOARDED = 'audit.screen.remote_onboarded';
export const AUDIT_SCREEN_REMOTE_ADDRESS_CHANGED = 'audit.screen.remote_address_changed';

/**
 * Remote-control changes to a screen. `details` must never carry the Developer
 * Mode passphrase: audit entries are shown in the organisation's own audit log,
 * and `audit_entries.details` is plain jsonb.
 */
export class AuditScreenRemoteEvent {
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

/**
 * Emitted when a freshly-provisioned invitee (no password yet) is added to an
 * org. Carries the single-use activation token (CSPRNG, never a password) so
 * the platform mailer can email a set-password link. Not an audit event —
 * consumed by the platform mailer.
 */
export const AUTH_USER_INVITED = 'auth.user.invited';

export class AuthUserInvitedEvent {
  constructor(
    public readonly email: string,
    public readonly activationToken: string,
  ) {}
}

/** Emitted on forgot-password so the platform mailer can send a reset link. */
export const AUTH_PASSWORD_RESET_REQUESTED = 'auth.password_reset.requested';

export class AuthPasswordResetRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly resetToken: string,
  ) {}
}

/**
 * Emitted on self-signup register / resend-verification so the platform mailer
 * can send the email-verification link. No org context: a self-signup user's
 * org has no SMTP, so this is always sent via the env-driven platform mailer.
 */
export const AUTH_EMAIL_VERIFICATION_REQUESTED = 'auth.email_verification.requested';

export class AuthEmailVerificationRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly verificationToken: string,
  ) {}
}

/**
 * Emitted when a user requests an email change. The platform mailer sends a
 * confirm link to the NEW address and a heads-up notice to the OLD address.
 */
export const AUTH_EMAIL_CHANGE_REQUESTED = 'auth.email_change.requested';

export class AuthEmailChangeRequestedEvent {
  constructor(
    public readonly oldEmail: string,
    public readonly newEmail: string,
    public readonly changeToken: string,
  ) {}
}

/** Emitted after a successful password change so the user gets a security notice. */
export const AUTH_PASSWORD_CHANGED = 'auth.password.changed';

export class AuthPasswordChangedEvent {
  constructor(public readonly email: string) {}
}

// ── Auth / Account audit (instance-level) ─────────────────────────────────────
// These are the *audit* counterparts of the auth flow (distinct from the mailer
// events above): emitted by the auth controller and consumed by AuditListener so
// the instance-wide audit log captures account lifecycle events. organisationId
// is null for self-signup / first-run setup (instance-level, not org-scoped).
export const AUDIT_USER_REGISTERED = 'audit.auth.user_registered';
export const AUDIT_EMAIL_VERIFIED = 'audit.auth.email_verified';
export const AUDIT_AUTH_EMAIL_CHANGE_REQUESTED = 'audit.auth.email_change_requested';
export const AUDIT_AUTH_EMAIL_CHANGED = 'audit.auth.email_changed';
export const AUDIT_AUTH_PASSWORD_RESET_REQUESTED = 'audit.auth.password_reset_requested';
export const AUDIT_AUTH_PASSWORD_CHANGED = 'audit.auth.password_changed';
export const AUDIT_SUPER_ADMIN_SETUP = 'audit.auth.super_admin_setup';

export class AuditAuthEvent {
  constructor(
    public readonly userId: string | null,
    public readonly organisationId: string | null,
    public readonly details: Record<string, unknown> | null,
  ) {}
}

// ── Platform email dispatch audit ─────────────────────────────────────────────
// Emitted by PlatformMailerService after each account/system mail send attempt
// so the instance admin can see what mail the server sent (and whether it
// succeeded). Carries no token — only recipient + subject.
export const AUDIT_EMAIL_SENT = 'audit.email.sent';
export const AUDIT_EMAIL_SEND_FAILED = 'audit.email.send_failed';

export class AuditEmailEvent {
  constructor(public readonly details: Record<string, unknown> | null) {}
}

// ── Organisation ─────────────────────────────────────────────────────────────
export const AUDIT_ORGANISATION_CREATED = 'audit.organisation.created';
export const AUDIT_ORGANISATION_UPDATED = 'audit.organisation.updated';
export const AUDIT_ORGANISATION_DELETED = 'audit.organisation.deleted';

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
