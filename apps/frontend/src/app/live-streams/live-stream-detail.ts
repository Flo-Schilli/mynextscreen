import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  IconComponent,
} from '../ui';
import {
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  LiveStream,
  StreamHealthState,
  TRANSCODING_PRESET_LABELS,
} from './live-stream.model';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamMonitor } from './live-stream-monitor';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';

type TargetMode = 'screens' | 'group';

/**
 * Smart, routed detail/monitor console for a single live stream
 * (`live-streams/:id`, Vorbild `screen-group-detail.ts`). State is held in
 * signals to stay correct under OnPush. Owns all HTTP: load (stream + screens +
 * groups), inline rename via `update`, `activate`/`deactivate`, a Restart
 * sequence (deactivate → activate), the audio toggle (idle only) and delete.
 *
 * Telemetry honesty (Entsch. 1): the monitor chrome is decorative; the health
 * card only renders real fields (health status, preset, "Live since"), never a
 * fabricated bitrate graph. Targeting (Entsch. 3/4a) maps onto the real DTO
 * (`targetScreenIds[]` XOR `targetGroupId`); for an idle stream the target is a
 * local signal sent on "Go live", and read-only while the stream is live.
 */
@Component({
  selector: 'app-live-stream-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IconComponent,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    CardHeadComponent,
    LiveStreamMonitor,
  ],
  template: `
    <div class="page">
      <button type="button" class="back-btn" (click)="goBack()">
        <mns-icon name="ChevronLeft" [size]="17" /> All streams
      </button>

      @if (loadError()) {
        <p class="error">{{ loadError() }}</p>
      }

      @if (loading()) {
        <p class="loading-text">Loading stream…</p>
      }

      @if (stream(); as s) {
        <!-- Header -->
        <mns-card>
          <div class="header">
            <span class="icon-tile" [class.live]="live()">
              <mns-icon name="Stream" [size]="25" />
            </span>
            <div class="header-main">
              <input
                class="name-input"
                [(ngModel)]="nameDraft"
                (blur)="commitName()"
                (keydown.enter)="commitName(); $any($event.target).blur()"
                (keydown.escape)="resetName(); $any($event.target).blur()"
                aria-label="Stream name"
              />
              <div class="badges">
                <mns-badge [tone]="live() ? 'offline' : 'neutral'" icon="Cast">
                  {{ statusLabel() }}
                </mns-badge>
                <mns-badge tone="neutral">{{ s.protocol.toUpperCase() }}</mns-badge>
                <mns-badge [tone]="targetCount() ? 'accent' : 'neutral'" icon="Screens">
                  {{ targetSummary() }}
                </mns-badge>
              </div>
            </div>
            <mns-btn variant="danger" size="sm" icon="Trash" (mnsClick)="emitDelete()">
              Delete
            </mns-btn>
          </div>
        </mns-card>

        <div class="grid">
          <!-- Left: monitor + transport + health -->
          <div class="col">
            <mns-card>
              <div class="monitor-frame">
                <app-live-stream-monitor
                  [streamId]="s.id"
                  [status]="s.status"
                  [transcodingPreset]="s.transcodingPreset"
                  [audioEnabled]="s.audioEnabled"
                  [big]="true"
                />
              </div>
              <div class="transport">
                @if (live()) {
                  <mns-btn variant="danger" icon="Power" [disabled]="busy()" (mnsClick)="stop()">
                    Stop stream
                  </mns-btn>
                } @else {
                  <mns-btn variant="primary" icon="Play" [disabled]="busy()" (mnsClick)="goLive()">
                    Go live
                  </mns-btn>
                }
                <mns-btn
                  variant="outline"
                  icon="Refresh"
                  [disabled]="!live() || busy()"
                  (mnsClick)="restart()"
                >
                  Restart
                </mns-btn>
                <button
                  type="button"
                  class="audio-btn"
                  [class.off]="!s.audioEnabled"
                  [disabled]="live() || busy()"
                  [title]="live() ? 'Stop the stream to change audio' : 'Toggle audio'"
                  (click)="toggleAudio()"
                >
                  <mns-icon [name]="s.audioEnabled ? 'Wifi' : 'WifiOff'" [size]="16" />
                  {{ s.audioEnabled ? 'Audio on' : 'Muted' }}
                </button>
                <div class="health-inline">
                  <span class="bars" aria-hidden="true">
                    @for (lvl of [1, 2, 3, 4]; track lvl) {
                      <span class="bar" [class.on]="live() && lvl <= healthBars()"></span>
                    }
                  </span>
                  {{ healthInlineText() }}
                </div>
              </div>
            </mns-card>

            <mns-card>
              <mns-card-head
                title="Stream health"
                [sub]="live() ? 'Live · preset targets shown below' : 'No active feed'"
                icon="Stream"
              />
              <div class="tiles">
                <div class="tile">
                  <div class="tile-label">Status</div>
                  <div class="tile-value">{{ healthStatusLabel() }}</div>
                </div>
                <div class="tile">
                  <div class="tile-label">Quality (target)</div>
                  <div class="tile-value">{{ presetLabel() }}</div>
                </div>
                <div class="tile">
                  <div class="tile-label">Protocol</div>
                  <div class="tile-value">{{ s.protocol.toUpperCase() }}</div>
                </div>
                <div class="tile">
                  <div class="tile-label">Live since</div>
                  <div class="tile-value">{{ liveSince() }}</div>
                </div>
              </div>
            </mns-card>
          </div>

          <!-- Right: source + broadcast -->
          <div class="col">
            <mns-card>
              <mns-card-head title="Source" sub="Ingest endpoint & encoding" icon="Cast" />
              <div class="src-label">Source URL</div>
              <div class="src-row">
                <div class="src-url">{{ s.sourceUrl }}</div>
                <button
                  type="button"
                  class="copy-btn"
                  [class.copied]="copied()"
                  title="Copy URL"
                  aria-label="Copy source URL"
                  (click)="copyUrl()"
                >
                  <mns-icon [name]="copied() ? 'Check' : 'Copy'" [size]="16" />
                </button>
              </div>
              <div class="tiles">
                <div class="tile">
                  <div class="tile-label">Protocol</div>
                  <div class="tile-value">{{ s.protocol.toUpperCase() }}</div>
                </div>
                <div class="tile">
                  <div class="tile-label">Quality</div>
                  <div class="tile-value">{{ presetLabel() }}</div>
                </div>
                <div class="tile">
                  <div class="tile-label">Audio</div>
                  <div class="tile-value">{{ s.audioEnabled ? 'Enabled' : 'Muted' }}</div>
                </div>
                <div class="tile">
                  <div class="tile-label">Health</div>
                  <div class="tile-value">{{ healthStatusLabel() }}</div>
                </div>
              </div>
            </mns-card>

            <mns-card>
              <mns-card-head
                title="Broadcast to"
                [sub]="
                  targetCount() ? 'Reaching ' + targetCount() + ' screen(s)' : 'No screens targeted'
                "
                icon="Screens"
              />

              @if (live()) {
                <p class="readonly-note">
                  <mns-icon name="Lock" [size]="14" /> Stop the stream to change targets.
                </p>
              }

              <div class="seg-row">
                <button
                  type="button"
                  class="seg"
                  [class.active]="targetMode() === 'screens'"
                  [disabled]="live()"
                  (click)="targetMode.set('screens')"
                >
                  <mns-icon name="Screens" [size]="14" /> Specific screens
                </button>
                <button
                  type="button"
                  class="seg"
                  [class.active]="targetMode() === 'group'"
                  [disabled]="live()"
                  (click)="targetMode.set('group')"
                >
                  <mns-icon name="Groups" [size]="14" /> Screen group
                </button>
              </div>

              @if (targetMode() === 'screens') {
                <div class="pick-list">
                  @for (sc of screens(); track sc.id) {
                    <button
                      type="button"
                      class="pick"
                      [class.on]="selectedScreenIds().includes(sc.id)"
                      [disabled]="live()"
                      (click)="toggleScreen(sc.id)"
                    >
                      <div class="pick-body">
                        <div class="pick-name">{{ sc.name }}</div>
                        <div class="pick-sub">{{ sc.resolution }} · {{ sc.location || '—' }}</div>
                      </div>
                      <span class="check" [class.on]="selectedScreenIds().includes(sc.id)">
                        @if (selectedScreenIds().includes(sc.id)) {
                          <mns-icon name="Check" [size]="13" />
                        }
                      </span>
                    </button>
                  }
                  @if (screens().length === 0) {
                    <div class="pick-empty">No screens available.</div>
                  }
                </div>
              } @else {
                <div class="pick-list">
                  @for (g of groups(); track g.id) {
                    <button
                      type="button"
                      class="pick"
                      [class.on]="selectedGroupId() === g.id"
                      [disabled]="live()"
                      (click)="selectGroup(g.id)"
                    >
                      <div class="pick-body">
                        <div class="pick-name">{{ g.name }}</div>
                        <div class="pick-sub">{{ g.mode }} · {{ g.screens.length }} screen(s)</div>
                      </div>
                      <span class="check" [class.on]="selectedGroupId() === g.id">
                        @if (selectedGroupId() === g.id) {
                          <mns-icon name="Check" [size]="13" />
                        }
                      </span>
                    </button>
                  }
                  @if (groups().length === 0) {
                    <div class="pick-empty">
                      No screen groups yet — create one on the Screen Groups page.
                    </div>
                  }
                </div>
              }

              @if (live() && targetCount() > 0) {
                <div class="override">
                  <mns-icon name="Alert" [size]="16" class="override-icon" />
                  <div>
                    <span class="override-strong">Live takes priority.</span> While this stream is
                    live it overrides any scheduled playlist on the targeted screens.
                  </div>
                </div>
              }
            </mns-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 16px;
      padding: 7px 13px 7px 9px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .back-btn:hover {
      color: var(--text);
    }
    .error {
      font-size: 0.875rem;
      color: var(--offline);
      padding: 0.75rem 1rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--offline) 30%, var(--border));
      background: var(--offline-dim);
      margin-bottom: 1rem;
    }
    .loading-text {
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .icon-tile {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      color: #fff;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--surface-3), var(--surface-2));
    }
    .icon-tile.live {
      background: linear-gradient(135deg, #ef4757, #b3243a);
      box-shadow: 0 8px 22px -10px rgba(239, 71, 87, 0.7);
    }
    .header-main {
      flex: 1;
      min-width: 0;
    }
    .name-input {
      width: 100%;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 2px 6px;
      margin: -2px -6px;
      font-family: inherit;
      outline: none;
    }
    .name-input:focus {
      background: var(--surface-2);
      border-color: var(--border-strong);
    }
    .badges {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.55fr 1fr;
      gap: var(--gap);
      align-items: start;
    }
    @media (max-width: 880px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: var(--gap);
    }
    .monitor-frame {
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: radial-gradient(130% 130% at 50% -10%, #0d1320, #06080d);
    }
    .transport {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .audio-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid var(--border-strong);
      background: transparent;
      color: var(--text);
      cursor: pointer;
    }
    .audio-btn.off {
      color: var(--text-faint);
    }
    .audio-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .health-inline {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12.5px;
      font-weight: 600;
    }
    .bars {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
      height: 13px;
    }
    .bar {
      width: 3px;
      border-radius: 1.5px;
      background: var(--border-strong);
    }
    .bar:nth-child(1) {
      height: 5px;
    }
    .bar:nth-child(2) {
      height: 8px;
    }
    .bar:nth-child(3) {
      height: 11px;
    }
    .bar:nth-child(4) {
      height: 13px;
    }
    .bar.on {
      background: var(--online);
    }
    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .tile {
      padding: 11px 13px;
      border-radius: 11px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .tile-label {
      font-size: 11.5px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .tile-value {
      font-size: 14px;
      font-weight: 700;
      margin-top: 2px;
    }
    .src-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 7px;
    }
    .src-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .src-url {
      flex: 1;
      min-width: 0;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .copy-btn {
      display: grid;
      place-items: center;
      width: 40px;
      flex-shrink: 0;
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-muted);
      cursor: pointer;
    }
    .copy-btn.copied {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .readonly-note {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--text-muted);
      margin: 0 0 12px;
    }
    .seg-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .seg {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 6px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      color: var(--text-muted);
    }
    .seg.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .seg:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .pick-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pick {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 11px;
      border-radius: 11px;
      text-align: left;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--surface-2);
    }
    .pick.on {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .pick:disabled {
      cursor: not-allowed;
    }
    .pick-body {
      flex: 1;
      min-width: 0;
    }
    .pick-name {
      font-size: 13.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pick-sub {
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .check {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      border-radius: 6px;
      flex-shrink: 0;
      border: 1px solid var(--border-strong);
      background: transparent;
      color: #fff;
    }
    .check.on {
      border-color: var(--accent);
      background: var(--accent);
    }
    .pick-empty {
      font-size: 13px;
      color: var(--text-muted);
      padding: 4px 0;
    }
    .override {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 14px;
      padding: 11px 13px;
      border-radius: 11px;
      border: 1px solid color-mix(in srgb, var(--warn) 40%, var(--border));
      background: var(--warn-dim);
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.45;
    }
    .override-icon {
      color: var(--warn);
      flex-shrink: 0;
      margin-top: 1px;
    }
    .override-strong {
      font-weight: 700;
      color: var(--text);
    }
  `,
})
export class LiveStreamDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private liveStreamService = inject(LiveStreamService);
  private screenService = inject(ScreenService);
  private screenGroupService = inject(ScreenGroupService);
  private memberService = inject(MemberService);
  private toast = inject(ToastService);

  protected readonly stream = signal<LiveStream | null>(null);
  protected readonly screens = signal<Screen[]>([]);
  protected readonly groups = signal<ScreenGroup[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);
  protected readonly health = signal<StreamHealthState | null>(null);

  // Inline rename draft (plain field bound via ngModel — committed explicitly).
  protected nameDraft = '';

  // Local target selection (Entsch. 4a).
  protected readonly targetMode = signal<TargetMode>('screens');
  protected readonly selectedScreenIds = signal<string[]>([]);
  protected readonly selectedGroupId = signal<string | null>(null);

  private orgId = '';

  protected readonly live = computed(() => this.stream()?.status === 'active');
  protected readonly statusLabel = computed(() => (this.live() ? 'Live' : 'Offline'));

  protected readonly presetLabel = computed(() => {
    const s = this.stream();
    if (!s) return '';
    return TRANSCODING_PRESET_LABELS[s.transcodingPreset] ?? s.transcodingPreset;
  });

  protected readonly targetCount = computed(() => {
    if (this.targetMode() === 'group') {
      const id = this.selectedGroupId();
      const g = this.groups().find((x) => x.id === id);
      return g ? g.screens.length : 0;
    }
    return this.selectedScreenIds().length;
  });

  protected readonly targetSummary = computed(() => {
    const count = this.targetCount();
    if (this.targetMode() === 'group') {
      return this.selectedGroupId() ? `1 group · ${count}` : 'No group';
    }
    return count ? `${count} screen(s)` : 'No screens';
  });

  protected readonly healthStatusLabel = computed(() => {
    const h = this.health();
    if (h?.health) return h.health;
    return this.live() ? 'Healthy' : 'Stopped';
  });

  protected readonly healthBars = computed(() => (this.live() ? 4 : 0));

  protected readonly healthInlineText = computed(() => (this.live() ? 'Healthy' : 'No feed'));

  protected readonly liveSince = computed(() => {
    const s = this.stream();
    if (!s || !this.live()) return '—';
    return new Date(s.updatedAt).toLocaleString();
  });

  ngOnInit(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const m = memberships.find((x) => x.role === 'org_admin') ?? memberships[0];
        if (m) {
          this.orgId = m.organisationId;
          this.loadData();
        } else {
          this.loadError.set('You are not a member of any organisation.');
          this.loading.set(false);
        }
      },
      error: () => {
        this.loadError.set('Failed to load organisation context.');
        this.loading.set(false);
      },
    });
  }

  private loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError.set('No stream ID provided.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      stream: this.liveStreamService.getOne(this.orgId, id),
      screens: this.screenService.getAll(this.orgId),
      groups: this.screenGroupService.getAll(this.orgId),
    }).subscribe({
      next: ({ stream, screens, groups }) => {
        this.applyStream(stream);
        this.screens.set(screens);
        this.groups.set(groups);
        this.loading.set(false);
        this.loadHealth(id);
      },
      error: (err) => {
        this.loadError.set(
          err.status === 404 ? 'Live stream not found.' : 'Failed to load live stream.',
        );
        this.loading.set(false);
      },
    });
  }

  private loadHealth(id: string): void {
    this.liveStreamService
      .getHealth(this.orgId, id)
      .pipe(catchError(() => of(null)))
      .subscribe((h) => this.health.set(h));
  }

  private applyStream(stream: LiveStream): void {
    this.stream.set(stream);
    this.nameDraft = stream.name;
  }

  // --- Inline rename ---
  protected commitName(): void {
    const s = this.stream();
    if (!s) return;
    const next = this.nameDraft.trim();
    if (!next || next === s.name) {
      this.nameDraft = s.name;
      return;
    }
    this.liveStreamService.update(this.orgId, s.id, { name: next }).subscribe({
      next: (updated) => {
        this.applyStream(updated);
        this.toast.success('Stream renamed.');
      },
      error: (err) => {
        this.nameDraft = s.name;
        this.toast.error(err.error?.message || 'Failed to rename stream.');
      },
    });
  }

  protected resetName(): void {
    this.nameDraft = this.stream()?.name ?? '';
  }

  // --- Audio toggle (idle only) ---
  protected toggleAudio(): void {
    const s = this.stream();
    if (!s || this.live() || this.busy()) return;
    this.liveStreamService.update(this.orgId, s.id, { audioEnabled: !s.audioEnabled }).subscribe({
      next: (updated) => {
        this.applyStream(updated);
        this.toast.success(updated.audioEnabled ? 'Audio enabled.' : 'Audio muted.');
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to update audio.'),
    });
  }

  // --- Transport ---
  private buildActivateDto(): ActivateLiveStreamRequest {
    if (this.targetMode() === 'group') {
      const id = this.selectedGroupId();
      return id ? { targetGroupId: id } : {};
    }
    return { targetScreenIds: this.selectedScreenIds() };
  }

  protected goLive(): void {
    const s = this.stream();
    if (!s || this.busy()) return;
    const dto = this.buildActivateDto();
    if (this.targetMode() === 'group' && !dto.targetGroupId) {
      this.toast.error('Select a screen group first.');
      return;
    }
    if (
      this.targetMode() === 'screens' &&
      (!dto.targetScreenIds || dto.targetScreenIds.length === 0)
    ) {
      this.toast.error('Select at least one screen first.');
      return;
    }

    this.busy.set(true);
    this.liveStreamService.activate(this.orgId, s.id, dto).subscribe({
      next: (res: ActivateStreamResponse) => {
        this.busy.set(false);
        this.applyStream(res.stream);
        if (res.warnings?.length) {
          res.warnings.forEach((w) => this.toast.info(w));
        }
        this.toast.success('Stream started.');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err.error?.message || 'Failed to start stream.');
      },
    });
  }

  protected stop(): void {
    const s = this.stream();
    if (!s || this.busy()) return;
    this.busy.set(true);
    this.liveStreamService.deactivate(this.orgId, s.id).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.applyStream(updated);
        this.toast.success('Stream stopped.');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err.error?.message || 'Failed to stop stream.');
      },
    });
  }

  protected restart(): void {
    const s = this.stream();
    if (!s || !this.live() || this.busy()) return;
    const dto = this.buildActivateDto();
    this.busy.set(true);
    this.liveStreamService
      .deactivate(this.orgId, s.id)
      .pipe(concatMap(() => this.liveStreamService.activate(this.orgId, s.id, dto)))
      .subscribe({
        next: (res: ActivateStreamResponse) => {
          this.busy.set(false);
          this.applyStream(res.stream);
          this.toast.success('Stream restarted.');
        },
        error: (err) => {
          this.busy.set(false);
          this.toast.error(err.error?.message || 'Failed to restart stream.');
        },
      });
  }

  // --- Target selection ---
  protected toggleScreen(id: string): void {
    if (this.live()) return;
    this.selectedScreenIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  protected selectGroup(id: string): void {
    if (this.live()) return;
    this.selectedGroupId.update((cur) => (cur === id ? null : id));
  }

  // --- Source ---
  protected copyUrl(): void {
    const s = this.stream();
    if (!s) return;
    navigator.clipboard
      .writeText(s.sourceUrl)
      .then(() => {
        this.copied.set(true);
        this.toast.success('Source URL copied.');
        setTimeout(() => this.copied.set(false), 1600);
      })
      .catch(() => this.toast.error('Failed to copy URL.'));
  }

  // --- Delete ---
  protected emitDelete(): void {
    const s = this.stream();
    if (!s || this.busy()) return;
    this.busy.set(true);
    this.liveStreamService.delete(this.orgId, s.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Live stream deleted.');
        this.goBack();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err.error?.message || 'Failed to delete stream.');
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/live-streams']);
  }
}
