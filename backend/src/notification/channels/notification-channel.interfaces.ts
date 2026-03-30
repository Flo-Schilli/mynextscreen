import { NotificationEventType } from '../notification-event-type.enum';

export interface NotificationPayload {
  eventType: NotificationEventType;
  title: string;
  message: string;
  resourceId?: string;
}

export interface InAppChannel {
  send(
    userId: string,
    orgId: string,
    notification: NotificationPayload,
  ): Promise<void>;
}

export interface EmailChannel {
  send(
    userId: string,
    orgId: string,
    notification: NotificationPayload,
  ): Promise<void>;
}

export interface NtfyChannel {
  send(orgId: string, notification: NotificationPayload): Promise<void>;
}

export const IN_APP_CHANNEL = Symbol('IN_APP_CHANNEL');
export const EMAIL_CHANNEL = Symbol('EMAIL_CHANNEL');
export const NTFY_CHANNEL = Symbol('NTFY_CHANNEL');
