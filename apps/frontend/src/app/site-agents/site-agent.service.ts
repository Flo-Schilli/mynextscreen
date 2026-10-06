import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateSiteAgentRequest,
  CreatedSiteAgent,
  DispatchedCommand,
  EnrolmentTokenResponse,
  RemoteCommandType,
  ScreenRemoteControl,
  SiteAgent,
  SiteAgentListItem,
  UpdateScreenRemoteControlRequest,
  UpdateSiteAgentRequest,
} from './site-agent.model';

@Injectable({ providedIn: 'root' })
export class SiteAgentService {
  private http = inject(HttpClient);

  // The organisation header and credentials are added by authInterceptor.

  getAll(): Observable<SiteAgentListItem[]> {
    return this.http.get<SiteAgentListItem[]>('/api/site-agents');
  }

  getOne(id: string): Observable<SiteAgent> {
    return this.http.get<SiteAgent>(`/api/site-agents/${id}`);
  }

  create(dto: CreateSiteAgentRequest): Observable<CreatedSiteAgent> {
    return this.http.post<CreatedSiteAgent>('/api/site-agents', dto);
  }

  update(id: string, dto: UpdateSiteAgentRequest): Observable<SiteAgent> {
    return this.http.patch<SiteAgent>(`/api/site-agents/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/site-agents/${id}`);
  }

  /** Issues a fresh token. Does not disconnect the agent that is running. */
  reissueEnrolment(id: string): Observable<EnrolmentTokenResponse> {
    return this.http.post<EnrolmentTokenResponse>(`/api/site-agents/${id}/enrolment-token`, {});
  }

  /**
   * Asks the agent to probe all of its displays now. Answers 202; the results
   * arrive as reachability events on the dashboard SSE stream. 409 when the
   * agent is not connected.
   */
  probeNow(id: string): Observable<DispatchedCommand> {
    return this.http.post<DispatchedCommand>(`/api/site-agents/${id}/probe`, {});
  }

  /** Ends every session; the agent has to be enrolled again to come back. */
  revoke(id: string): Observable<{ revoked: number }> {
    return this.http.post<{ revoked: number }>(`/api/site-agents/${id}/revoke`, {});
  }

  getRemoteControl(screenId: string): Observable<ScreenRemoteControl> {
    return this.http.get<ScreenRemoteControl>(`/api/screens/${screenId}/remote-control`);
  }

  /**
   * Forgets a screen's remote-control settings entirely — address, passphrase
   * and onboarding progress included — so adding it to an agent again starts
   * from scratch rather than reusing a previous installation's values.
   */
  removeRemoteControl(screenId: string): Observable<void> {
    return this.http.delete<void>(`/api/screens/${screenId}/remote-control`);
  }

  updateRemoteControl(
    screenId: string,
    dto: UpdateScreenRemoteControlRequest,
  ): Observable<ScreenRemoteControl> {
    return this.http.put<ScreenRemoteControl>(`/api/screens/${screenId}/remote-control`, dto);
  }

  /**
   * Asks the agent to act now. Answers 202 with a correlation id; the outcome
   * arrives on the dashboard SSE stream, not on this response.
   */
  sendCommand(screenId: string, type: RemoteCommandType): Observable<DispatchedCommand> {
    return this.http.post<DispatchedCommand>(`/api/screens/${screenId}/remote-control/commands`, {
      type,
    });
  }

  /** One onboarding step; same 202-then-SSE shape as {@link sendCommand}. */
  runCheck(screenId: string, step: number): Observable<DispatchedCommand> {
    return this.http.post<DispatchedCommand>(`/api/screens/${screenId}/remote-control/checks`, {
      step,
    });
  }
}
