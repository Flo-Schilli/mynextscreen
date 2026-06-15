import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlertRules {
  offline: boolean;
  recovered: boolean;
  transcodeFail: boolean;
  storage: boolean;
  weekly: boolean;
}

export interface OrgNotificationConfigFull {
  id: string;
  organisationId: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
  ntfyUrl: string | null;
  ntfyTopic: string | null;
  ntfyToken: string | null;
  alertRules: AlertRules;
}

export interface UpdateOrgNotificationConfig {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
  smtpSecure?: boolean;
  ntfyUrl?: string | null;
  ntfyTopic?: string | null;
  ntfyToken?: string | null;
  alertRules?: AlertRules;
}

@Injectable({ providedIn: 'root' })
export class OrgNotificationConfigService {
  private http = inject(HttpClient);

  getConfig(orgId: string): Observable<OrgNotificationConfigFull> {
    return this.http.get<OrgNotificationConfigFull>(
      `/api/organisations/${orgId}/notification-config`,
    );
  }

  updateConfig(
    orgId: string,
    config: UpdateOrgNotificationConfig,
  ): Observable<OrgNotificationConfigFull> {
    return this.http.patch<OrgNotificationConfigFull>(
      `/api/organisations/${orgId}/notification-config`,
      config,
    );
  }

  testEmail(orgId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `/api/organisations/${orgId}/notification-config/test-email`,
      {},
    );
  }

  testNtfy(orgId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `/api/organisations/${orgId}/notification-config/test-ntfy`,
      {},
    );
  }
}
