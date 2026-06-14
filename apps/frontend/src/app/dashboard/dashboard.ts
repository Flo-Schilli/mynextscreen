import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { StorageUsageBars } from '../shared/storage-usage-bars';
import { DashboardScheduleTimeline } from './dashboard-schedule-timeline';
import { DashboardActivityFeed } from './dashboard-activity-feed';
import {
  BadgeComponent,
  BarComponent,
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  IconComponent,
  PageHeaderComponent,
  RingComponent,
  StatusDotComponent,
} from '../ui';

interface OnboardingStep {
  key: 'screen' | 'content' | 'playlist' | 'schedule';
  icon: 'Screens' | 'Upload' | 'Playlists' | 'Schedules';
  title: string;
  desc: string;
  cta: string;
  route: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'screen',
    icon: 'Screens',
    title: 'Add your first screen',
    desc: 'Pair a display with a one-time code. Takes about 30 seconds.',
    cta: 'Add screen',
    route: '/screens',
  },
  {
    key: 'content',
    icon: 'Upload',
    title: 'Upload content',
    desc: 'Bring in images and video. We transcode and optimise automatically.',
    cta: 'Upload media',
    route: '/content',
  },
  {
    key: 'playlist',
    icon: 'Playlists',
    title: 'Build a playlist',
    desc: 'Sequence your content and set durations and transitions.',
    cta: 'Create playlist',
    route: '/playlists',
  },
  {
    key: 'schedule',
    icon: 'Schedules',
    title: 'Schedule & publish',
    desc: 'Choose when and where it plays, then push it live.',
    cta: 'Schedule',
    route: '/schedules',
  },
];

/**
 * Smart container for the dashboard. Owns data loading (screens, storage,
 * schedule), live SSE updates, the rolling activity feed and the timeline/hours
 * derivation. Renders onboarding state when data is empty, populated dashboard
 * once the org has screens. Delegates each card body to a presentational child.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    DashboardScreenGrid,
    StorageUsageBars,
    DashboardScheduleTimeline,
    DashboardActivityFeed,
    CardComponent,
    CardHeadComponent,
    BadgeComponent,
    BtnComponent,
    IconComponent,
    PageHeaderComponent,
    RingComponent,
    BarComponent,
    StatusDotComponent,
  ],
  template: `
    @if (dataState() === 'onboarding') {
      <!-- ======== ONBOARDING STATE ======== -->
      <mns-page-header
        title="Welcome to myNextScreen"
        sub="Let's get your first display live. Four quick steps."
      />

      <!-- progress banner -->
      <mns-card [animate]="true" class="mb-5">
        <div class="flex items-center gap-6 relative overflow-hidden">
          <div class="onboarding-glow"></div>
          <mns-ring [value]="onboardingProgress()" [size]="92" [sw]="9">
            <div class="text-center">
              <div class="mono text-[22px] font-bold leading-none">
                {{ onboardingDone() }}<span class="text-faint text-[15px]">/4</span>
              </div>
            </div>
          </mns-ring>
          <div class="flex-1 relative">
            <div class="text-[18px] font-bold">
              @if (onboardingDone() === 0) {
                Set up your network
              } @else if (onboardingDone() === 4) {
                You're all set!
              } @else {
                Nice progress — keep going
              }
            </div>
            <div class="text-[14px] text-muted mt-1">
              @if (onboardingDone() === 4) {
                Loading your live dashboard…
              } @else {
                {{ 4 - onboardingDone() }} step{{ 4 - onboardingDone() > 1 ? 's' : '' }} left to
                publish your first content.
              }
            </div>
          </div>
          @if (screens().length > 0) {
            <mns-badge tone="online">
              <mns-status-dot status="online" [pulse]="true" [size]="7" />
              &nbsp;{{ screens().length }} screen{{ screens().length > 1 ? 's' : '' }} online
            </mns-badge>
          }
        </div>
      </mns-card>

      <!-- step cards -->
      <div class="flex flex-col gap-4">
        @for (step of onboardingSteps; track step.key; let i = $index) {
          <mns-card
            [animate]="true"
            [delay]="i * 0.06"
            [hover]="!onboardingStepDone(step.key)"
            class="step-card"
            [class.step-card--active]="i === onboardingFirstIncomplete()"
            [class.step-card--done]="onboardingStepDone(step.key)"
            [class.step-card--dim]="
              !onboardingStepDone(step.key) && i !== onboardingFirstIncomplete()
            "
          >
            <div class="flex items-center gap-4">
              <!-- icon tile -->
              <div
                class="step-icon"
                [class.step-icon--done]="onboardingStepDone(step.key)"
                [class.step-icon--active]="
                  i === onboardingFirstIncomplete() && !onboardingStepDone(step.key)
                "
              >
                @if (onboardingStepDone(step.key)) {
                  <mns-icon name="Check" [size]="24" />
                } @else {
                  <mns-icon [name]="step.icon" [size]="22" />
                }
              </div>
              <!-- text -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span
                    class="mono text-[12px] font-semibold"
                    [class]="onboardingStepDone(step.key) ? 'text-online' : 'text-faint'"
                  >
                    {{ onboardingStepDone(step.key) ? 'DONE' : 'STEP ' + (i + 1) }}
                  </span>
                </div>
                <div class="text-[15.5px] font-bold mt-0.5">{{ step.title }}</div>
                <div class="text-[13px] text-muted mt-1">{{ step.desc }}</div>
              </div>
              <!-- action -->
              @if (onboardingStepDone(step.key)) {
                <mns-badge tone="online" icon="Check">Complete</mns-badge>
              } @else {
                <mns-btn
                  [variant]="i === onboardingFirstIncomplete() ? 'primary' : 'soft'"
                  size="sm"
                  iconRight="Arrow"
                  (mnsClick)="navigateTo(step.route)"
                >
                  {{ step.cta }}
                </mns-btn>
              }
            </div>
          </mns-card>
        }
      </div>
    } @else {
      <!-- ======== POPULATED STATE ======== -->
      <mns-page-header title="Dashboard" [sub]="dashboardSub()" />

      <!-- KPI row -->
      <div class="kpi-row">
        <!-- Screens online -->
        <mns-card [animate]="true" [hover]="true">
          <div class="kpi-card">
            <div class="flex items-center justify-between">
              <span class="text-[13px] font-semibold text-muted">Screens online</span>
              <span class="kpi-icon kpi-icon--online">
                <mns-icon name="Power" [size]="18" />
              </span>
            </div>
            <div class="kpi-value mono">{{ screensOnline() }}</div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[12.5px] text-muted"> {{ screensOffline() }} offline </span>
              <svg class="sparkline" [attr.viewBox]="'0 0 76 26'" fill="none">
                <defs>
                  <linearGradient id="sg-online" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="var(--online)" stop-opacity="0.28" />
                    <stop offset="1" stop-color="var(--online)" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path [attr.d]="onlineSparkArea()" fill="url(#sg-online)" />
                <path
                  [attr.d]="onlineSparkLine()"
                  fill="none"
                  stroke="var(--online)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </mns-card>

        <!-- Storage used -->
        <mns-card [animate]="true" [delay]="0.05" [hover]="true">
          <div class="kpi-card">
            <div class="flex items-center justify-between">
              <span class="text-[13px] font-semibold text-muted">Storage used</span>
              <span class="kpi-icon kpi-icon--accent">
                <mns-icon name="Storage" [size]="18" />
              </span>
            </div>
            <div class="kpi-value mono">
              {{ storageUsedGb() }}<span class="text-[16px] text-muted font-normal"> GB</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[12.5px] text-muted">of {{ storageTotalGb() }} GB limit</span>
              <mns-bar [value]="storagePercent()" [h]="6" class="w-[76px]" />
            </div>
          </div>
        </mns-card>

        <!-- Active schedules -->
        <mns-card [animate]="true" [delay]="0.1" [hover]="true">
          <div class="kpi-card">
            <div class="flex items-center justify-between">
              <span class="text-[13px] font-semibold text-muted">Upcoming events</span>
              <span class="kpi-icon kpi-icon--info">
                <mns-icon name="Schedules" [size]="18" />
              </span>
            </div>
            <div class="kpi-value mono">{{ scheduleEntries().length }}</div>
            <span class="text-[12.5px] text-muted">next 24 hours</span>
          </div>
        </mns-card>

        <!-- Activity -->
        <mns-card [animate]="true" [delay]="0.15" [hover]="true">
          <div class="kpi-card">
            <div class="flex items-center justify-between">
              <span class="text-[13px] font-semibold text-muted">Recent events</span>
              <span class="kpi-icon kpi-icon--neutral">
                <mns-icon name="Audit" [size]="18" />
              </span>
            </div>
            <div class="kpi-value mono">{{ activityFeed().length }}</div>
            <span class="text-[12.5px] text-muted">live feed</span>
          </div>
        </mns-card>
      </div>

      <!-- main grid: screens + (storage + schedule) -->
      <div class="main-grid mb-5">
        <!-- Screens live -->
        <mns-card [animate]="true" [delay]="0.05">
          <mns-card-head title="Screens" [sub]="screensSubline()" icon="Screens">
            <mns-btn
              slot="right"
              variant="ghost"
              size="sm"
              iconRight="Arrow"
              (mnsClick)="navigateTo('/screens')"
            >
              View all
            </mns-btn>
          </mns-card-head>
          @if (loadingScreens()) {
            <div class="empty-msg">Loading screens…</div>
          } @else if (screens().length === 0) {
            <div class="empty-state">No screens registered yet.</div>
          } @else {
            <app-dashboard-screen-grid
              [screens]="screens()"
              (selectScreen)="navigateToScreen($event)"
            />
          }
        </mns-card>

        <!-- right column -->
        <div class="right-col">
          <!-- Storage donut -->
          <mns-card [animate]="true" [delay]="0.08">
            <mns-card-head title="Storage" sub="Media library usage" icon="Storage" />
            @if (loadingStorage()) {
              <div class="empty-msg">Loading storage…</div>
            } @else if (!storage()) {
              <div class="empty-state">No storage data available.</div>
            } @else {
              <div class="storage-layout">
                <mns-ring [value]="storagePercent()" [size]="104" [sw]="11">
                  <div class="text-center">
                    <div class="mono text-[22px] font-bold leading-none">
                      {{ storagePercent() | number: '1.0-0' }}<span class="text-[13px]">%</span>
                    </div>
                    <div class="text-[11px] text-muted mt-0.5">used</div>
                  </div>
                </mns-ring>
                <app-storage-usage-bars [storage]="storage()!" />
              </div>
            }
          </mns-card>
        </div>
      </div>

      <!-- bottom grid: schedule timeline + activity -->
      <div class="bottom-grid">
        <!-- Schedule timeline -->
        <mns-card [animate]="true" [delay]="0.1">
          <mns-card-head title="Upcoming Schedule" sub="Next 24 hours" icon="Schedules">
            <mns-badge slot="right" tone="neutral">{{ scheduleEntries().length }} events</mns-badge>
          </mns-card-head>
          @if (loadingSchedule()) {
            <div class="empty-msg">Loading schedule…</div>
          } @else if (timelineRows().length === 0) {
            <div class="empty-state">No upcoming schedules.</div>
          } @else {
            <app-dashboard-schedule-timeline [rows]="timelineRows()" [hours]="timelineHours()" />
          }
        </mns-card>

        <!-- Activity feed -->
        <mns-card [animate]="true" [delay]="0.12">
          <mns-card-head title="Recent Activity" sub="Team & system events" icon="Audit" />
          @if (activityFeed().length === 0) {
            <div class="empty-state">No recent activity.</div>
          } @else {
            <app-dashboard-activity-feed [entries]="activityFeed()" />
          }
        </mns-card>
      </div>
    }
  `,
  styles: `
    /* ── KPI row ── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--gap, 1.25rem);
      margin-bottom: var(--gap, 1.25rem);
    }
    .kpi-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .kpi-value {
      font-size: 34px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .kpi-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      flex-shrink: 0;
    }
    .kpi-icon--online {
      background: var(--online-dim);
      color: var(--online);
    }
    .kpi-icon--accent {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .kpi-icon--info {
      background: var(--info-dim);
      color: var(--info);
    }
    .kpi-icon--neutral {
      background: var(--surface-3);
      color: var(--text-muted);
    }

    .sparkline {
      width: 76px;
      height: 26px;
      overflow: visible;
      flex-shrink: 0;
    }

    /* ── Main grid ── */
    .main-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
      gap: var(--gap, 1.25rem);
      margin-bottom: var(--gap, 1.25rem);
      align-items: start;
    }
    .right-col {
      display: flex;
      flex-direction: column;
      gap: var(--gap, 1.25rem);
    }
    .storage-layout {
      display: flex;
      align-items: center;
      gap: 22px;
    }

    /* ── Bottom grid ── */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--gap, 1.25rem);
      align-items: start;
    }

    /* ── Onboarding ── */
    .onboarding-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(420px 160px at 88% 20%, var(--accent-soft), transparent 70%);
      pointer-events: none;
      border-radius: inherit;
    }
    .step-card {
      opacity: 1;
      transition: opacity 0.18s;
    }
    .step-card--dim {
      opacity: 0.62;
    }
    .step-icon {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 13px;
      flex-shrink: 0;
      background: var(--surface-3);
      color: var(--text-faint);
    }
    .step-icon--done {
      background: var(--online-dim);
      color: var(--online);
    }
    .step-icon--active {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
    }

    /* ── Shared ── */
    .empty-state,
    .empty-msg {
      color: var(--text-muted);
      font-size: 0.8125rem;
      padding: 1rem 0;
      text-align: center;
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .kpi-row {
        grid-template-columns: repeat(2, 1fr);
      }
      .main-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 768px) {
      .kpi-row {
        grid-template-columns: 1fr 1fr;
      }
      .bottom-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 560px) {
      .kpi-row {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .step-card,
      .kpi-icon {
        animation: none !important;
        transition: none !important;
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

  // ── Onboarding steps config ──
  readonly onboardingSteps = ONBOARDING_STEPS;

  /** Whether the given onboarding step is complete, derived from real data signals. */
  onboardingStepDone(key: OnboardingStep['key']): boolean {
    switch (key) {
      case 'screen':
        return this.screens().length > 0;
      case 'content':
        return this.storage() !== null && (this.storage()?.originalUsedBytes ?? 0) > 0;
      case 'playlist':
        return false; // no playlist signal yet — always shows as incomplete
      case 'schedule':
        return this.scheduleEntries().length > 0;
    }
  }

  readonly onboardingDone = computed(
    () => ONBOARDING_STEPS.filter((s) => this.onboardingStepDone(s.key)).length,
  );

  readonly onboardingProgress = computed(() => (this.onboardingDone() / 4) * 100);

  readonly onboardingFirstIncomplete = computed(() =>
    ONBOARDING_STEPS.findIndex((s) => !this.onboardingStepDone(s.key)),
  );

  /**
   * `dataState` drives onboarding vs populated view.
   * Shows populated once at least one screen has been registered.
   */
  readonly dataState = computed<'onboarding' | 'populated'>(() => {
    if (this.loadingScreens()) return 'onboarding';
    return this.screens().length > 0 ? 'populated' : 'onboarding';
  });

  // ── Populated dashboard helpers ──
  readonly screensOnline = computed(() => this.screens().filter((s) => s.isOnline).length);
  readonly screensOffline = computed(() => this.screens().filter((s) => !s.isOnline).length);

  readonly screensSubline = computed(
    () => `${this.screensOnline()} of ${this.screens().length} active`,
  );

  readonly dashboardSub = computed(() => {
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    return `${greeting} · ${today}`;
  });

  // Storage KPIs
  readonly storageUsedGb = computed(() => {
    const s = this.storage();
    if (!s) return '0.0';
    return ((s.originalUsedBytes + s.transcodedUsedBytes) / 1e9).toFixed(1);
  });

  readonly storageTotalGb = computed(() => {
    const s = this.storage();
    if (!s) return '0.0';
    return ((s.originalLimitBytes + s.transcodedLimitBytes) / 1e9).toFixed(1);
  });

  readonly storagePercent = computed(() => {
    const s = this.storage();
    if (!s) return 0;
    const total = s.originalLimitBytes + s.transcodedLimitBytes;
    if (total === 0) return 0;
    return Math.round(((s.originalUsedBytes + s.transcodedUsedBytes) / total) * 100);
  });

  // Simple sparklines for the KPI cards (online screen count trend — last 7 ticks)
  private readonly sparkBase = computed(() => {
    const n = this.screensOnline();
    // Build a synthetic 7-point trend ending at current value
    return [
      Math.max(0, n - 2),
      Math.max(0, n - 2),
      Math.max(0, n - 1),
      Math.max(0, n - 1),
      n,
      Math.max(0, n - 1),
      n,
    ];
  });

  readonly onlineSparkLine = computed(() => this.buildSparkPath(this.sparkBase()));
  readonly onlineSparkArea = computed(() => this.buildSparkArea(this.sparkBase()));

  // ── Timeline ──
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

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // ── Sparkline helpers ──
  private buildSparkPath(data: number[]): string {
    const w = 76;
    const h = 26;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
      return [x, y] as [number, number];
    });
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  }

  private buildSparkArea(data: number[]): string {
    const w = 76;
    const h = 26;
    const line = this.buildSparkPath(data);
    return `${line} L${w} ${h} L0 ${h} Z`;
  }
}
