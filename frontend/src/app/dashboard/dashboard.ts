import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScreenService } from '../screens/screen.service';
import { ContentService } from '../content/content.service';
import { ScheduleService } from '../schedules/schedule.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { DashboardSseService } from './dashboard-sse.service';
import { Screen } from '../screens/screen.model';
import { StorageInfo } from '../content/content.model';
import { ScheduleEntry } from '../schedules/schedule.model';
import { ActivityEntry, TimelineEntry, TimelineRow } from './dashboard.model';
import { DashboardScreenGrid } from './dashboard-screen-grid';
import { DashboardStorageUsage } from './dashboard-storage-usage';
import { DashboardScheduleTimeline } from './dashboard-schedule-timeline';
import { DashboardActivityFeed } from './dashboard-activity-feed';

/**
 * Smart container for the dashboard. Owns data loading (screens, storage,
 * schedule), live SSE updates, the rolling activity feed and the timeline/hours
 * derivation. Renders the card grid + headers + loading/empty states and
 * delegates each populated card body to a presentational child.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    DashboardScreenGrid,
    DashboardStorageUsage,
    DashboardScheduleTimeline,
    DashboardActivityFeed,
  ],
  template: `
    <div class="dashboard">
      <h1 class="page-title">Dashboard</h1>

      <div class="dashboard-grid">
        <!-- Screen Status Grid -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Screen Status</h2>
            <span class="card-badge">{{ screens().length }} screens</span>
          </div>
          <div class="card-body">
            @if (loadingScreens()) {
              <div class="loading-placeholder">Loading screens...</div>
            } @else if (screens().length === 0) {
              <div class="empty-state">No screens registered yet.</div>
            } @else {
              <app-dashboard-screen-grid
                [screens]="screens()"
                (selectScreen)="navigateToScreen($event)"
              />
            }
          </div>
        </section>

        <!-- Storage Usage Bar -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Storage Usage</h2>
          </div>
          <div class="card-body">
            @if (loadingStorage()) {
              <div class="loading-placeholder">Loading storage info...</div>
            } @else if (!storage()) {
              <div class="empty-state">No storage data available.</div>
            } @else {
              <app-dashboard-storage-usage [storage]="storage()!" />
            }
          </div>
        </section>

        <!-- Upcoming Schedule Timeline -->
        <section class="card card-wide">
          <div class="card-header">
            <h2 class="card-title">Upcoming Schedule</h2>
            <span class="card-badge">Next 24 hours</span>
          </div>
          <div class="card-body">
            @if (loadingSchedule()) {
              <div class="loading-placeholder">Loading schedule...</div>
            } @else if (timelineRows().length === 0) {
              <div class="empty-state">No upcoming schedules.</div>
            } @else {
              <app-dashboard-schedule-timeline [rows]="timelineRows()" [hours]="timelineHours()" />
            }
          </div>
        </section>

        <!-- Recent Activity Feed -->
        <section class="card card-wide">
          <div class="card-header">
            <h2 class="card-title">Recent Activity</h2>
          </div>
          <div class="card-body">
            @if (activityFeed().length === 0) {
              <div class="empty-state">No recent activity.</div>
            } @else {
              <app-dashboard-activity-feed [entries]="activityFeed()" />
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .dashboard {
      color: var(--color-text-primary);
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }

    /* ── Grid layout ── */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    .card-wide {
      grid-column: 1 / -1;
    }

    /* ── Card ── */
    .card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary);
    }
    .card-badge {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-bg-tertiary);
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
    }
    .card-body {
      padding: 1rem;
    }

    .loading-placeholder,
    .empty-state {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      padding: 1rem 0;
      text-align: center;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      .card-wide {
        grid-column: 1;
      }
    }
  `,
})
export class Dashboard implements OnInit, OnDestroy {
  private router = inject(Router);
  private screenService = inject(ScreenService);
  private contentService = inject(ContentService);
  private scheduleService = inject(ScheduleService);
  private orgState = inject(OrganisationStateService);
  private socketService = inject(DashboardSseService);

  private subscriptions: Subscription[] = [];

  readonly screens = signal<Screen[]>([]);
  readonly storage = signal<StorageInfo | null>(null);
  readonly scheduleEntries = signal<ScheduleEntry[]>([]);
  readonly activityFeed = signal<ActivityEntry[]>([]);

  readonly loadingScreens = signal(false);
  readonly loadingStorage = signal(false);
  readonly loadingSchedule = signal(false);

  private timelineStart = new Date();

  readonly timelineHours = computed(() => {
    const hours: string[] = [];
    const start = new Date(this.timelineStart);
    for (let i = 0; i <= 24; i += 3) {
      const h = new Date(start.getTime() + i * 60 * 60 * 1000);
      hours.push(h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    return hours;
  });

  readonly timelineRows = computed(() => {
    const entries = this.scheduleEntries();
    const screenMap = new Map<string, { name: string; entries: ScheduleEntry[] }>();

    for (const entry of entries) {
      const screenName = entry.screen?.name ?? entry.group?.name ?? 'Unknown';
      const targetId = entry.screenId ?? entry.groupId ?? 'unknown';
      if (!screenMap.has(targetId)) {
        screenMap.set(targetId, { name: screenName, entries: [] });
      }
      screenMap.get(targetId)!.entries.push(entry);
    }

    const startMs = this.timelineStart.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;
    const rangeMs = endMs - startMs;

    const rows: TimelineRow[] = [];
    for (const [, screen] of screenMap) {
      const timelineEntries: TimelineEntry[] = [];
      for (const entry of screen.entries) {
        const entryStart = Math.max(new Date(entry.startTime).getTime(), startMs);
        const entryEnd = Math.min(new Date(entry.endTime).getTime(), endMs);
        if (entryEnd <= entryStart) continue;

        const startPercent = ((entryStart - startMs) / rangeMs) * 100;
        const widthPercent = ((entryEnd - entryStart) / rangeMs) * 100;

        timelineEntries.push({
          playlistName: entry.playlist?.name ?? 'Unknown',
          colour: entry.colour || '#3b82f6',
          startPercent,
          widthPercent,
          startTime: new Date(entryStart).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          endTime: new Date(entryEnd).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
      rows.push({ screenName: screen.name, entries: timelineEntries });
    }
    return rows;
  });

  private orgEffect = effect(() => {
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      this.loadData(orgId);
    }
  });

  ngOnInit(): void {
    this.subscriptions.push(
      this.socketService.screenOnline$.subscribe((event) => {
        this.updateScreenStatus(event.data['screenId'] as string, true);
        this.addActivity('screen', `Screen came online`);
      }),
      this.socketService.screenOffline$.subscribe((event) => {
        this.updateScreenStatus(event.data['screenId'] as string, false);
        this.addActivity('screen', `Screen went offline`);
      }),
      this.socketService.scheduleUpdated$.subscribe(() => {
        this.addActivity('schedule', `Schedule updated`);
        const orgId = this.orgState.selectedOrgId();
        if (orgId) this.loadSchedule(orgId);
      }),
      this.socketService.transcodingComplete$.subscribe(() => {
        this.addActivity('transcoding', `Transcoding completed`);
      }),
      this.socketService.transcodingFailed$.subscribe(() => {
        this.addActivity('transcoding', `Transcoding failed`);
      }),
      this.socketService.transcodingProgress$.subscribe((event) => {
        const progress = event.data['progress'] as number;
        this.addActivity('transcoding', `Transcoding progress: ${progress}%`);
      }),
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }

  private loadData(orgId: string): void {
    this.loadScreens(orgId);
    this.loadStorage(orgId);
    this.loadSchedule(orgId);
  }

  private loadScreens(orgId: string): void {
    this.loadingScreens.set(true);
    this.screenService.getAll(orgId).subscribe({
      next: (screens) => {
        this.screens.set(screens);
        this.loadingScreens.set(false);
      },
      error: () => this.loadingScreens.set(false),
    });
  }

  private loadStorage(orgId: string): void {
    this.loadingStorage.set(true);
    this.contentService.getStorage(orgId).subscribe({
      next: (info) => {
        this.storage.set(info);
        this.loadingStorage.set(false);
      },
      error: () => this.loadingStorage.set(false),
    });
  }

  private loadSchedule(orgId: string): void {
    this.loadingSchedule.set(true);
    this.timelineStart = new Date();
    const from = this.timelineStart.toISOString();
    const to = new Date(this.timelineStart.getTime() + 24 * 60 * 60 * 1000).toISOString();

    this.scheduleService.getByDateRange(orgId, from, to).subscribe({
      next: (entries) => {
        this.scheduleEntries.set(entries);
        this.loadingSchedule.set(false);
      },
      error: () => this.loadingSchedule.set(false),
    });
  }

  private updateScreenStatus(screenId: string, isOnline: boolean): void {
    const updated = this.screens().map((s) => (s.id === screenId ? { ...s, isOnline } : s));
    this.screens.set(updated);
  }

  private addActivity(
    category: 'screen' | 'schedule' | 'transcoding' | 'info',
    description: string,
  ): void {
    const entry: ActivityEntry = {
      timestamp: new Date().toISOString(),
      category,
      description,
    };
    const current = this.activityFeed();
    this.activityFeed.set([entry, ...current].slice(0, 20));
  }

  navigateToScreen(id: string): void {
    this.router.navigate(['/screens'], { queryParams: { id } });
  }
}
