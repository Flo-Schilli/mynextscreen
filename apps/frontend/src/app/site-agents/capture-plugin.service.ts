import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CapturePluginLicenseText, CapturePluginStatus } from './site-agent.model';

/**
 * HTTP access to an agent's video capture plugin: its reported state and the
 * license acceptance. The organisation header and credentials are added by
 * authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class CapturePluginService {
  private readonly http = inject(HttpClient);

  getStatus(agentId: string): Observable<CapturePluginStatus> {
    return this.http.get<CapturePluginStatus>(`/api/site-agents/${agentId}/capture-plugin`);
  }

  /** 404 until the agent has delivered the text. */
  getLicenseText(agentId: string): Observable<CapturePluginLicenseText> {
    return this.http.get<CapturePluginLicenseText>(
      `/api/site-agents/${agentId}/capture-plugin/license-text`,
    );
  }

  /** Accepts exactly the license version whose hash is passed. 409 when it has changed. */
  accept(agentId: string, licenseSha256: string): Observable<CapturePluginStatus> {
    return this.http.post<CapturePluginStatus>(
      `/api/site-agents/${agentId}/capture-plugin/acceptance`,
      { licenseSha256 },
    );
  }

  revoke(agentId: string): Observable<void> {
    return this.http.delete<void>(`/api/site-agents/${agentId}/capture-plugin/acceptance`);
  }
}
