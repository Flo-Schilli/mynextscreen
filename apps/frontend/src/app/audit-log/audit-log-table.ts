import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditEntry, AUDIT_ACTION_LABELS } from './audit-log.model';
import { BadgeComponent, BadgeTone, BtnComponent, EmptyComponent, IconComponent } from '../ui';
import type { IconName } from '../ui';
import { AuditLogCard } from './audit-log-card';

// ── action taxonomy ──────────────────────────────────────────────────────────

interface ActionMeta {
  tone: BadgeTone;
  icon: IconName;
}

const ACTION_META: Record<string, ActionMeta> = {
  'content.upload': { tone: 'info', icon: 'Upload' },
  'content.delete': { tone: 'offline', icon: 'Trash' },
  'content.reupload': { tone: 'info', icon: 'Upload' },
  'content.bulk_deleted': { tone: 'offline', icon: 'Trash' },
  'content.bulk_tagged': { tone: 'info', icon: 'Hash' },
  'content.bulk_untagged': { tone: 'neutral', icon: 'Hash' },
  'content.bulk_added_to_playlist': { tone: 'accent', icon: 'Playlists' },
  'playlist.create': { tone: 'accent', icon: 'Playlists' },
  'playlist.update': { tone: 'info', icon: 'Pencil' },
  'playlist.delete': { tone: 'offline', icon: 'Trash' },
  'playlist.bulk_deleted': { tone: 'offline', icon: 'Trash' },
  'playlist.bulk_screen_assigned': { tone: 'accent', icon: 'Screens' },
  'schedule.create': { tone: 'accent', icon: 'Schedules' },
  'schedule.update': { tone: 'info', icon: 'Pencil' },
  'schedule.delete': { tone: 'offline', icon: 'Trash' },
  'screen.register': { tone: 'warning', icon: 'Screens' },
  'screen.update': { tone: 'info', icon: 'Pencil' },
  'screen.key_regenerated': { tone: 'warning', icon: 'Lock' },
  'screen.online': { tone: 'online', icon: 'Wifi' },
  'screen.offline': { tone: 'offline', icon: 'WifiOff' },
  'screen.bulk_deleted': { tone: 'offline', icon: 'Trash' },
  'screen.bulk_group_assigned': { tone: 'info', icon: 'Groups' },
  'user.invited': { tone: 'accent', icon: 'Mail' },
  'user.role_changed': { tone: 'warning', icon: 'User' },
  'user.removed': { tone: 'offline', icon: 'User' },
  'organisation.created': { tone: 'accent', icon: 'Building' },
  'organisation.updated': { tone: 'info', icon: 'Building' },
  'group.created': { tone: 'accent', icon: 'Groups' },
  'group.updated': { tone: 'info', icon: 'Groups' },
  'group.deleted': { tone: 'offline', icon: 'Groups' },
  'group.screen_added': { tone: 'online', icon: 'Screens' },
  'group.screen_removed': { tone: 'offline', icon: 'Screens' },
  'group.mode_changed': { tone: 'info', icon: 'Groups' },
  'live_stream.created': { tone: 'accent', icon: 'Stream' },
  'live_stream.updated': { tone: 'info', icon: 'Stream' },
  'live_stream.deleted': { tone: 'offline', icon: 'Stream' },
  'live_stream.activated': { tone: 'online', icon: 'Stream' },
  'live_stream.deactivated': { tone: 'neutral', icon: 'Stream' },
  'live_stream.failed': { tone: 'offline', icon: 'Stream' },
  'auth.user_registered': { tone: 'accent', icon: 'User' },
  'auth.email_verified': { tone: 'online', icon: 'CheckCircle' },
  'auth.email_change_requested': { tone: 'info', icon: 'Mail' },
  'auth.email_changed': { tone: 'info', icon: 'Mail' },
  'auth.password_reset_requested': { tone: 'warning', icon: 'Lock' },
  'auth.password_changed': { tone: 'warning', icon: 'Lock' },
  'auth.super_admin_setup': { tone: 'accent', icon: 'Settings' },
  'email.sent': { tone: 'online', icon: 'Mail' },
  'email.send_failed': { tone: 'offline', icon: 'Mail' },
};

function actionMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? { tone: 'neutral', icon: 'Dots' };
}

// ── day-grouping helpers ─────────────────────────────────────────────────────

function dayLabel(iso: string): string {
  const ts = new Date(iso);
  const now = new Date();
  const a = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return ts.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type TableRow =
  | { kind: 'divider'; label: string; key: string }
  | { kind: 'entry'; entry: AuditEntry; key: string };

/**
 * Presentational audit-log table with grouped day headers, expandable detail
 * rows and a "load more" footer. Renders each entry with an action badge,
 * resolved user/resource display and a details tooltip; emits `loadMore` and
 * `selectResource`. The parent owns data loading and navigation, and feeds the
 * resolved `userMap` in.
 */
@Component({
  selector: 'app-audit-log-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, BtnComponent, EmptyComponent, IconComponent, AuditLogCard],
  template: `
    <!-- table card: no extra padding so header/rows bleed edge-to-edge -->
    <div
      class="bg-surface border border-border rounded-lg overflow-hidden"
      style="box-shadow:var(--shadow)"
    >
      <!-- ── table view (tablet and up) ── -->
      <div class="hidden md:block overflow-x-auto">
        <div class="min-w-[900px]">
          <!-- column header -->
          <div
            class="grid gap-4 px-5 h-11 items-center bg-surface-2 sticky top-0 z-[5]"
            style="grid-template-columns:32px 180px 1fr 200px 130px minmax(160px,1.3fr) minmax(140px,1.2fr)"
          >
            @for (h of headers; track h) {
              <div class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
                {{ h }}
              </div>
            }
          </div>

          <!-- rows + day dividers -->
          @if (rows().length === 0) {
            <div class="border-t border-border">
              <mns-empty
                icon="Search"
                title="No matching entries"
                desc="Try clearing a filter or widening the date range."
              />
            </div>
          } @else {
            @for (row of rows(); track row.key) {
              @if (row.kind === 'divider') {
                <!-- day group header -->
                <div
                  class="flex items-center gap-2.5 px-5 py-2 bg-surface-2 border-t border-border"
                >
                  <mns-icon name="Calendar" [size]="13" class="text-faint" />
                  <span class="text-[11.5px] font-bold tracking-[.04em] text-muted">
                    {{ row.label }}
                  </span>
                </div>
              } @else {
                <!-- entry row -->
                <div
                  class="border-t border-border cursor-pointer relative"
                  [class.bg-surface-2]="expandedId() === row.entry.id"
                  (click)="toggleExpand(row.entry.id)"
                  (keydown.enter)="toggleExpand(row.entry.id)"
                  tabindex="0"
                  [attr.aria-expanded]="expandedId() === row.entry.id"
                >
                  <!-- accent bar (left edge) -->
                  <span
                    class="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full transition-opacity duration-[150ms]"
                    [style.background]="toneColor(row.entry.action)"
                    [style.opacity]="expandedId() === row.entry.id ? 1 : 0"
                  ></span>

                  <!-- main row grid -->
                  <div
                    class="grid gap-4 pr-5 h-[60px] items-center group hover:bg-hover transition-colors duration-[120ms]"
                    style="grid-template-columns:32px 180px 1fr 200px 130px minmax(160px,1.3fr) minmax(140px,1.2fr)"
                  >
                    <!-- chevron -->
                    <div class="grid place-items-center pl-2 text-faint">
                      <mns-icon
                        name="Chevron"
                        [size]="15"
                        class="transition-transform duration-[180ms]"
                        [style.transform]="expandedId() === row.entry.id ? 'rotate(90deg)' : 'none'"
                      />
                    </div>

                    <!-- timestamp -->
                    <div class="flex flex-col items-start gap-px min-w-0">
                      <span class="timestamp-cell font-mono text-[13px] font-semibold text-text">
                        {{ row.entry.timestamp | date: 'HH:mm:ss' }}
                      </span>
                      <span class="text-[11.5px] text-faint">{{
                        relativeTime(row.entry.timestamp)
                      }}</span>
                    </div>

                    <!-- user -->
                    <div class="flex items-center gap-2 min-w-0 text-[13.5px]">
                      <span class="truncate font-semibold">{{
                        getUserDisplay(row.entry.userId)
                      }}</span>
                    </div>

                    <!-- action badge -->
                    <div class="flex items-center min-w-0">
                      <span
                        class="action-badge"
                        [attr.data-category]="actionCategory(row.entry.action)"
                      >
                        <mns-badge
                          [tone]="actionMeta(row.entry.action).tone"
                          [icon]="actionMeta(row.entry.action).icon"
                        >
                          {{ actionLabel(row.entry.action) }}
                        </mns-badge>
                      </span>
                    </div>

                    <!-- resource type -->
                    <div class="resource-type-cell min-w-0 text-[13px] text-muted truncate">
                      {{ row.entry.resourceType }}
                    </div>

                    <!-- resource -->
                    <div class="min-w-0">
                      @if (row.entry.resourceId) {
                        <a
                          class="resource-link font-mono text-[12.5px] font-semibold text-info truncate block hover:underline focus:outline-none focus:underline"
                          [title]="getResourceDisplay(row.entry)"
                          tabindex="-1"
                          (click)="onResourceClick($event, row.entry)"
                          (keydown.enter)="onResourceClick($event, row.entry)"
                          >{{ getResourceDisplay(row.entry) }}</a
                        >
                      } @else {
                        <span class="text-muted text-[13px]">—</span>
                      }
                    </div>

                    <!-- details -->
                    <div class="details-cell min-w-0">
                      @if (row.entry.details && hasDetails(row.entry.details)) {
                        <span
                          class="details-text text-[12.5px] text-muted truncate block cursor-help"
                          [title]="formatDetailsTooltip(row.entry.details)"
                          >{{ formatDetails(row.entry.details) }}</span
                        >
                      } @else {
                        <span class="text-faint text-[13px]">—</span>
                      }
                    </div>
                  </div>

                  <!-- expanded detail panel -->
                  @if (expandedId() === row.entry.id) {
                    <div
                      class="bg-surface-2 px-5 pb-5 pt-1 pl-[51px]"
                      style="animation:fadeIn .18s ease both"
                    >
                      <div
                        class="border-t border-dashed border-border-strong pt-4 grid gap-x-7 gap-y-3.5"
                        style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"
                      >
                        <div class="min-w-0">
                          <div
                            class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1"
                          >
                            Event ID
                          </div>
                          <div class="font-mono text-[12.5px] font-semibold text-text break-all">
                            {{ row.entry.id }}
                          </div>
                        </div>
                        <div class="min-w-0">
                          <div
                            class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1"
                          >
                            Resource ID
                          </div>
                          <div class="font-mono text-[12.5px] font-semibold text-text break-all">
                            {{ row.entry.resourceId ?? '—' }}
                          </div>
                        </div>
                        <div class="min-w-0">
                          <div
                            class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1"
                          >
                            Timestamp
                          </div>
                          <div class="text-[13.5px] font-semibold text-text">
                            {{ row.entry.timestamp | date: 'medium' }}
                          </div>
                        </div>
                        <div class="min-w-0">
                          <div
                            class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1"
                          >
                            Actor
                          </div>
                          <div class="text-[13.5px] font-semibold text-text">
                            {{ getUserDisplay(row.entry.userId) }}
                          </div>
                        </div>
                        <div class="min-w-0">
                          <div
                            class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1"
                          >
                            Resource type
                          </div>
                          <div class="text-[13.5px] font-semibold text-text">
                            {{ row.entry.resourceType }}
                          </div>
                        </div>
                        @if (row.entry.details) {
                          @for (kv of detailEntries(row.entry.details); track kv.key) {
                            <div class="min-w-0">
                              <div
                                class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1"
                              >
                                {{ kv.key }}
                              </div>
                              <div class="text-[13.5px] font-semibold text-accent break-words">
                                {{ kv.value }}
                              </div>
                            </div>
                          }
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            }
          }
        </div>
      </div>

      <!-- ── stacked-card view (mobile) ── -->
      <div class="md:hidden">
        @if (rows().length === 0) {
          <mns-empty
            icon="Search"
            title="No matching entries"
            desc="Try clearing a filter or widening the date range."
          />
        } @else {
          @for (row of rows(); track row.key) {
            @if (row.kind === 'divider') {
              <!-- day group header -->
              <div
                class="flex items-center gap-2.5 px-[var(--card-pad)] py-2 bg-surface-2 border-t border-border"
              >
                <mns-icon name="Calendar" [size]="13" class="text-faint" />
                <span class="text-[11.5px] font-bold tracking-[.04em] text-muted">
                  {{ row.label }}
                </span>
              </div>
            } @else {
              <app-audit-log-card
                [entry]="row.entry"
                [userDisplay]="getUserDisplay(row.entry.userId)"
                [resourceDisplay]="getResourceDisplay(row.entry)"
                [actionLabel]="actionLabel(row.entry.action)"
                [actionCategory]="actionCategory(row.entry.action)"
                [actionMeta]="actionMeta(row.entry.action)"
                [detailEntries]="row.entry.details ? detailEntries(row.entry.details) : []"
                (selectResource)="selectResource.emit($event)"
              />
            }
          }
        }
      </div>

      <!-- load-more / pagination footer -->
      @if (hasMore()) {
        <div
          class="load-more-container flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-surface-2"
        >
          <span class="count-text text-[12.5px] text-muted">
            Showing {{ entries().length }} of {{ total() }} entries
          </span>
          <mns-btn
            variant="outline"
            size="sm"
            [disabled]="loading()"
            (mnsClick)="loadMore.emit()"
            >{{ loading() ? 'Loading…' : 'Load more' }}</mns-btn
          >
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    /* ── action badge tones via data-category ── */
    .action-badge[data-category='content'] mns-badge span {
      background: var(--info-dim);
      color: var(--info);
    }
    .action-badge[data-category='playlist'] mns-badge span {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .action-badge[data-category='schedule'] mns-badge span {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .action-badge[data-category='screen'] mns-badge span {
      background: var(--warn-dim);
      color: var(--warn);
    }
    .action-badge[data-category='group'] mns-badge span {
      background: var(--info-dim);
      color: var(--info);
    }
    .action-badge[data-category='user'] mns-badge span {
      background: var(--offline-dim);
      color: var(--offline);
    }
    .action-badge[data-category='organisation'] mns-badge span {
      background: var(--online-dim);
      color: var(--online);
    }
    .action-badge[data-category='live_stream'] mns-badge span {
      background: var(--online-dim);
      color: var(--online);
    }
    .action-badge[data-category='auth'] mns-badge span {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .action-badge[data-category='email'] mns-badge span {
      background: var(--info-dim);
      color: var(--info);
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
    }
  `,
})
export class AuditLogTable {
  readonly entries = input.required<AuditEntry[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly hasMore = input.required<boolean>();
  readonly userMap = input.required<Map<string, string>>();
  /** When true, an Organisation column is rendered (instance-admin view). */
  readonly showOrganisation = input(false);
  /** Maps organisationId → display name; used only when showOrganisation is true. */
  readonly orgMap = input<Map<string, string>>(new Map());

  readonly loadMore = output<void>();
  readonly selectResource = output<{ resourceType: string; resourceId: string | null }>();

  protected readonly expandedId = signal<string | null>(null);

  protected readonly headers = ['', 'Timestamp', 'User', 'Action', 'Type', 'Resource', 'Details'];

  /** Build row list: inject day-dividers between consecutive date groups. */
  protected readonly rows = computed<TableRow[]>(() => {
    const result: TableRow[] = [];
    let lastDay = '';
    for (const entry of this.entries()) {
      const dl = dayLabel(entry.timestamp);
      if (dl !== lastDay) {
        result.push({ kind: 'divider', label: dl, key: `d-${dl}` });
        lastDay = dl;
      }
      result.push({ kind: 'entry', entry, key: entry.id });
    }
    return result;
  });

  protected toggleExpand(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  protected actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }

  protected actionCategory(action: string): string {
    return action.split('.')[0];
  }

  protected actionMeta(action: string): ActionMeta {
    return actionMeta(action);
  }

  /** CSS color string for the accent sidebar bar. */
  protected toneColor(action: string): string {
    const tone = actionMeta(action).tone;
    if (tone === 'neutral') return 'var(--text-muted)';
    if (tone === 'accent') return 'var(--accent)';
    if (tone === 'warning') return 'var(--warn)';
    return `var(--${tone})`;
  }

  protected getUserDisplay(userId: string | null): string {
    if (!userId) return 'System';
    return this.userMap().get(userId) ?? `${userId.substring(0, 8)}...`;
  }

  protected getOrgDisplay(organisationId: string | null): string {
    if (!organisationId) return 'Instance';
    return this.orgMap().get(organisationId) ?? `${organisationId.substring(0, 8)}...`;
  }

  protected getResourceDisplay(entry: AuditEntry): string {
    if (!entry.resourceId) return '—';
    const details = entry.details;
    if (details) {
      const name =
        (details['name'] as string) ??
        (details['title'] as string) ??
        (details['filename'] as string) ??
        (details['email'] as string);
      if (name) return name;
    }
    return `${entry.resourceId.substring(0, 8)}...`;
  }

  protected hasDetails(details: Record<string, unknown>): boolean {
    return Object.keys(details).length > 0;
  }

  protected formatDetails(details: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === 'name' || key === 'title' || key === 'filename' || key === 'email') continue;
      parts.push(`${key}: ${value}`);
    }
    return parts.join(', ') || '—';
  }

  protected formatDetailsTooltip(details: Record<string, unknown>): string {
    return JSON.stringify(details, null, 2);
  }

  protected detailEntries(details: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(details).map(([k, v]) => ({ key: k, value: String(v) }));
  }

  protected relativeTime(iso: string): string {
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
    const d = Math.round(h / 24);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  }

  protected onResourceClick(event: Event, entry: AuditEntry): void {
    event.stopPropagation();
    this.selectResource.emit({ resourceType: entry.resourceType, resourceId: entry.resourceId });
  }
}
