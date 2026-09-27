export interface Notification {
  id: string;
  userId: string;
  organisationId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  resourceId?: string;
}

export type NotificationEventType =
  'screen.offline' | 'screen.online' | 'transcoding.complete' | 'transcoding.failed';

export interface UnreadCountResponse {
  count: number;
}
