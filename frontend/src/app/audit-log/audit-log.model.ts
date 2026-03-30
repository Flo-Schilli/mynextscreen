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
  'group.created': 'Screen group created',
  'group.updated': 'Screen group updated',
  'group.deleted': 'Screen group deleted',
  'group.screen_added': 'Screen added to group',
  'group.screen_removed': 'Screen removed from group',
  'group.mode_changed': 'Group mode changed',
  'live_stream.created': 'Live stream created',
  'live_stream.updated': 'Live stream updated',
  'live_stream.deleted': 'Live stream deleted',
  'live_stream.activated': 'Live stream activated',
  'live_stream.deactivated': 'Live stream deactivated',
  'live_stream.failed': 'Live stream failed',
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
