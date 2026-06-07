import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScreenService } from '../screens/screen.service';
import { ContentService } from '../content/content.service';
import { ScheduleService } from '../schedules/schedule.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { DashboardSseService } from './dashboard-sse.service';
import { Screen } from '../screens/screen.model';
import { StorageInfo } from '../content/content.model';
import { ScheduleEntry } from '../schedules/schedule.model';

interface TimelineRow {
  screenName: string;
  entries: TimelineEntry[];
}

interface TimelineEntry {
  playlistName: string;
  colour: string;
  startPercent: number;
  widthPercent: number;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
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
              <div class="screen-grid">
                @for (screen of screens(); track screen.id) {
                  <button
                    class="screen-tile"
                    [class.online]="screen.isOnline"
                    [class.offline]="!screen.isOnline && screen.lastHeartbeat"
                    [class.never]="!screen.isOnline && !screen.lastHeartbeat"
                    (click)="navigateToScreen(screen.id)"
                  >
                    <span class="screen-dot"></span>
                    <span class="screen-name">{{ screen.name }}</span>
                    <span class="screen-location">{{ screen.location || 'No location' }}</span>
                  </button>
                }
              </div>
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
              <div class="storage-section">
                <div class="storage-label-row">
                  <span class="storage-label">Originals</span>
                  <span class="storage-value"
                    >{{ formatBytes(storage()!.originalUsedBytes) }} /
                    {{ formatBytes(storage()!.originalLimitBytes) }}</span
                  >
                </div>
                <div
                  class="storage-bar"
                  [class.warning]="originalPercent() > 80 && originalPercent() <= 95"
                  [class.danger]="originalPercent() > 95"
                >
                  <div class="storage-fill originals" [style.width.%]="originalPercent()"></div>
                </div>
                <span class="storage-percent">{{ originalPercent().toFixed(1) }}%</span>
              </div>

              <div class="storage-section">
                <div class="storage-label-row">
                  <span class="storage-label">Transcoded</span>
                  <span class="storage-value"
                    >{{ formatBytes(storage()!.transcodedUsedBytes) }} /
                    {{ formatBytes(storage()!.transcodedLimitBytes) }}</span
                  >
                </div>
                <div
                  class="storage-bar"
                  [class.warning]="transcodedPercent() > 80 && transcodedPercent() <= 95"
                  [class.danger]="transcodedPercent() > 95"
                >
                  <div class="storage-fill transcoded" [style.width.%]="transcodedPercent()"></div>
                </div>
                <span class="storage-percent">{{ transcodedPercent().toFixed(1) }}%</span>
              </div>
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
              <div class="timeline">
                <div class="timeline-header">
                  <span class="timeline-screen-label"></span>
                  <div class="timeline-hours">
                    @for (hour of timelineHours(); track hour) {
                      <span class="timeline-hour">{{ hour }}</span>
                    }
                  </div>
                </div>
                @for (row of timelineRows(); track row.screenName) {
                  <div class="timeline-row">
                    <span class="timeline-screen-label" [title]="row.screenName">{{
                      row.screenName
                    }}</span>
                    <div class="timeline-track">
                      @for (entry of row.entries; track entry.startPercent) {
                        <div
                          class="timeline-block"
                          [style.left.%]="entry.startPercent"
                          [style.width.%]="entry.widthPercent"
                          [style.background]="entry.colour"
                          [title]="
                            entry.playlistName +
                            ' (' +
                            entry.startTime +
                            ' - ' +
                            entry.endTime +
                            ')'
                          "
                        ></div>
                      }
                    </div>
                  </div>
                }
              </div>
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
              <div class="activity-feed">
                @for (entry of activityFeed(); track entry.timestamp) {
                  <div class="activity-item">
                    <span class="activity-dot" [class]="'activity-dot--' + entry.category"></span>
                    <span class="activity-time">{{ entry.timestamp | date: 'HH:mm:ss' }}</span>
                    <span class="activity-text">{{ entry.description }}</span>
                  </div>
                }
              </div>
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

    /* ── Screen Status Grid ── */
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.625rem;
    }
    .screen-tile {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background: var(--color-bg-tertiary);
      cursor: pointer;
      text-align: left;
      color: var(--color-text-primary);
      transition:
        border-color 0.15s,
        transform 0.1s;
    }
    .screen-tile:hover {
      border-color: var(--color-accent);
      transform: translateY(-1px);
    }
    .screen-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-bottom: 0.25rem;
    }
    .screen-tile.online .screen-dot {
      background: #22c55e;
    }
    .screen-tile.offline .screen-dot {
      background: #ef4444;
    }
    .screen-tile.never .screen-dot {
      background: #6b7280;
    }

    .screen-name {
      font-size: 0.8125rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .screen-location {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Storage ── */
    .storage-section {
      margin-bottom: 1rem;
    }
    .storage-section:last-child {
      margin-bottom: 0;
    }
    .storage-label-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }
    .storage-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    .storage-value {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .storage-bar {
      height: 8px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }
    .storage-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .storage-fill.originals {
      background: var(--color-accent);
    }
    .storage-fill.transcoded {
      background: #8b5cf6;
    }
    .storage-bar.warning .storage-fill {
      background: #f59e0b;
    }
    .storage-bar.danger .storage-fill {
      background: #ef4444;
    }
    .storage-percent {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }

    /* ── Timeline ── */
    .timeline {
      overflow-x: auto;
    }
    .timeline-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .timeline-hours {
      flex: 1;
      display: flex;
      justify-content: space-between;
      padding: 0 2px;
    }
    .timeline-hour {
      font-size: 0.625rem;
      color: var(--color-text-muted);
      width: 0;
      text-align: center;
    }
    .timeline-row {
      display: flex;
      align-items: center;
      margin-bottom: 0.375rem;
    }
    .timeline-screen-label {
      width: 90px;
      min-width: 90px;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 0.5rem;
    }
    .timeline-track {
      flex: 1;
      height: 20px;
      background: var(--color-bg-tertiary);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }
    .timeline-block {
      position: absolute;
      top: 2px;
      bottom: 2px;
      border-radius: 2px;
      min-width: 2px;
      opacity: 0.85;
    }

    /* ── Activity Feed ── */
    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 320px;
      overflow-y: auto;
    }
    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    .activity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .activity-dot--screen {
      background: #22c55e;
    }
    .activity-dot--schedule {
      background: #3b82f6;
    }
    .activity-dot--transcoding {
      background: #8b5cf6;
    }
    .activity-dot--info {
      background: #6b7280;
    }

    .activity-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      min-width: 56px;
      font-variant-numeric: tabular-nums;
    }
    .activity-text {
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

  readonly originalPercent = computed(() => {
    const s = this.storage();
    if (!s || s.originalLimitBytes === 0) return 0;
    return Math.min((s.originalUsedBytes / s.originalLimitBytes) * 100, 100);
  });

  readonly transcodedPercent = computed(() => {
    const s = this.storage();
    if (!s || s.transcodedLimitBytes === 0) return 0;
    return Math.min((s.transcodedUsedBytes / s.transcodedLimitBytes) * 100, 100);
  });

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

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }
}

interface ActivityEntry {
  timestamp: string;
  category: 'screen' | 'schedule' | 'transcoding' | 'info';
  description: string;
}
