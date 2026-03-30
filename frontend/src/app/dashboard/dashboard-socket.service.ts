import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

export interface DashboardEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardSocketService implements OnDestroy {
  private authService = inject(AuthService);
  private orgState = inject(OrganisationStateService);
  private socket: Socket | null = null;
  private connectedOrgId: string | null = null;

  readonly screenOnline$ = new Subject<DashboardEvent>();
  readonly screenOffline$ = new Subject<DashboardEvent>();
  readonly scheduleUpdated$ = new Subject<DashboardEvent>();
  readonly transcodingProgress$ = new Subject<DashboardEvent>();
  readonly transcodingComplete$ = new Subject<DashboardEvent>();
  readonly transcodingFailed$ = new Subject<DashboardEvent>();
  readonly notificationNew$ = new Subject<DashboardEvent>();

  connect(): void {
    const token = this.authService.getToken();
    const orgId = this.orgState.selectedOrgId();
    if (!token || !orgId) return;

    // No-op if already connected for the same org
    if (this.socket?.connected && this.connectedOrgId === orgId) return;

    this.disconnect();

    this.connectedOrgId = orgId;
    this.socket = io('/', {
      auth: { token, organisationId: orgId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('screen.online', (payload: DashboardEvent) =>
      this.screenOnline$.next(payload),
    );
    this.socket.on('screen.offline', (payload: DashboardEvent) =>
      this.screenOffline$.next(payload),
    );
    this.socket.on('schedule.updated', (payload: DashboardEvent) =>
      this.scheduleUpdated$.next(payload),
    );
    this.socket.on('transcoding.progress', (payload: DashboardEvent) =>
      this.transcodingProgress$.next(payload),
    );
    this.socket.on('transcoding.complete', (payload: DashboardEvent) =>
      this.transcodingComplete$.next(payload),
    );
    this.socket.on('transcoding.failed', (payload: DashboardEvent) =>
      this.transcodingFailed$.next(payload),
    );
    this.socket.on('notification.new', (payload: DashboardEvent) =>
      this.notificationNew$.next(payload),
    );
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectedOrgId = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
