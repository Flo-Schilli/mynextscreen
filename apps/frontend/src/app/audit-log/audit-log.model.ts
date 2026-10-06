export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  organisationId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditLogResponse {
  data: AuditEntry[];
  total: number;
}

export interface AuditLogFilters {
  action?: string;
  userId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const AUDIT_ACTIONS = [
  'content.upload',
  'content.delete',
  'content.reupload',
  'playlist.create',
  'playlist.update',
  'playlist.delete',
  'schedule.create',
  'schedule.update',
  'schedule.delete',
  'screen.register',
  'screen.update',
  'screen.key_regenerated',
  'screen.online',
  'screen.offline',
  'user.invited',
  'user.role_changed',
  'user.removed',
  'organisation.created',
  'organisation.updated',
  'group.created',
  'group.updated',
  'group.deleted',
  'group.screen_added',
  'group.screen_removed',
  'group.mode_changed',
  'live_stream.created',
  'live_stream.updated',
  'live_stream.deleted',
  'live_stream.activated',
  'live_stream.deactivated',
  'live_stream.failed',
  'screen.bulk_deleted',
  'screen.bulk_group_assigned',
  'content.bulk_deleted',
  'content.bulk_tagged',
  'content.bulk_untagged',
  'content.bulk_added_to_playlist',
  'playlist.bulk_deleted',
  'playlist.bulk_screen_assigned',
];

export const RESOURCE_TYPES = [
  'content',
  'playlist',
  'schedule',
  'screen',
  'user',
  'organisation',
  'screen-group',
  'live-stream',
];

/**
 * Instance-level account/email audit actions — only ever recorded with no (or
 * cross-org) organisation scope, so they live in the super-admin instance view
 * rather than the per-org audit log.
 */
export const INSTANCE_AUDIT_ACTIONS = [
  ...AUDIT_ACTIONS,
  'auth.user_registered',
  'auth.email_verified',
  'auth.email_change_requested',
  'auth.email_changed',
  'auth.password_reset_requested',
  'auth.password_changed',
  'auth.super_admin_setup',
  'email.sent',
  'email.send_failed',
];

export const INSTANCE_RESOURCE_TYPES = [...RESOURCE_TYPES, 'account', 'email'];
