import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationPreferences {
  id: string;
  userId: string;
  organisationId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  ntfyEnabled: boolean;
}

export interface OrgNotificationConfig {
  smtpHost: string | null;
  ntfyUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  private http = inject(HttpClient);

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>('/api/me/notification-preferences');
  }

  updatePreferences(
    prefs: Partial<Pick<NotificationPreferences, 'inAppEnabled' | 'emailEnabled' | 'ntfyEnabled'>>,
  ): Observable<NotificationPreferences> {
    return this.http.patch<NotificationPreferences>('/api/me/notification-preferences', prefs);
  }

  getOrgNotificationConfig(orgId: string): Observable<OrgNotificationConfig> {
    return this.http.get<OrgNotificationConfig>(`/api/organisations/${orgId}/notification-config`);
  }
}
