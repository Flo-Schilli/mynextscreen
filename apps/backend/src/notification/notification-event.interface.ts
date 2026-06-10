import { NotificationEventType } from './notification-event-type.enum';

export interface NotificationEvent {
  orgId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  resourceId?: string;
}
