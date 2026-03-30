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

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'content.upload': 'Content uploaded',
  'content.delete': 'Content deleted',
  'content.reupload': 'Content re-uploaded',
  'playlist.create': 'Playlist created',
  'playlist.update': 'Playlist updated',
  'playlist.delete': 'Playlist deleted',
  'schedule.create': 'Schedule created',
  'schedule.update': 'Schedule updated',
  'schedule.delete': 'Schedule deleted',
  'screen.register': 'Screen registered',
  'screen.update': 'Screen updated',
  'screen.key_regenerated': 'Screen key regenerated',
  'screen.online': 'Screen came online',
  'screen.offline': 'Screen went offline',
  'user.invited': 'User invited',
  'user.role_changed': 'User role changed',
  'user.removed': 'User removed',
  'organisation.created': 'Organisation created',
  'organisation.updated': 'Organisation updated',
};

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
];

export const RESOURCE_TYPES = [
  'content',
  'playlist',
  'schedule',
  'screen',
  'user',
  'organisation',
];
