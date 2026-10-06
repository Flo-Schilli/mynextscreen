import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';

import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { InstanceAdminService } from './instance-admin.service';
import { InstanceAdminSummary, SystemLoad } from './instance-admin.model';
import { LoadGraphComponent, LoadData } from './load-graph.component';
import { OrganisationService } from '../organisations/organisation.service';
import { Organisation } from '../organisations/organisation.model';
import { formatBytes } from '../../shared/format-bytes';
import {
  CardComponent,
  CardHeadComponent,
  BadgeComponent,
  BarComponent,
  RingComponent,
  CountComponent,
  IconComponent,
  AvatarComponent,
} from '../../ui';
import { AdminTabsComponent } from '../admin-tabs.component';
import { LocaleNumberPipe } from '../../i18n/locale-format.pipes';

/**
 * Smart container for the instance-admin overview dashboard.
 * Loads the aggregate instance summary (user counts, organisation count,
 * storage limits vs. usage across all tenants and host disk free space)
 * and renders it using mns-* UI primitives per the myNextScreen design spec.
 */
@Component({
  selector: 'app-instance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminTabsComponent,
    LocaleNumberPipe,
    IconComponent,
    CardComponent,
    CardHeadComponent,
    BadgeComponent,
    BarComponent,
    RingComponent,
    CountComponent,
    AvatarComponent,
    LoadGraphComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <!-- ── Page header (amber chrome) ── -->
      <div class="flex items-end justify-between gap-4 flex-wrap mb-[22px]">
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center gap-[13px] min-w-0">
            <!-- amber header tile -->
            <span
              class="grid place-items-center w-11 h-11 rounded-[12px] flex-shrink-0 text-white"
              style="background:linear-gradient(135deg,var(--color-elevated),var(--color-elevated-2));box-shadow:0 8px 20px -10px var(--color-elevated)"
            >
              <mns-icon name="Settings" [size]="23" />
            </span>
            <div class="min-w-0">
              <h1 class="m-0 text-[27px] font-extrabold tracking-[-0.025em]">
                {{ t('admin.instanceAdmin') }}
              </h1>
              <div class="text-muted text-[14px] mt-[3px]">
                {{ t('admin.dashboard.subtitle') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Tab bar ── -->
      <app-admin-tabs />

      <!-- ── Error / loading ── -->
      @if (loadError()) {
        <p class="text-offline text-sm">{{ loadError() }}</p>
      }
      @if (loading()) {
        <p class="text-muted text-sm">{{ t('admin.dashboard.loading') }}</p>
      }

      @if (summary(); as s) {
        <div class="flex flex-col gap-[var(--gap)]">
          <!-- KPI row -->
          <div class="grid grid-cols-4 gap-[var(--gap)] adm-kpi">
            <!-- Organisations -->
            <mns-card [hover]="true">
              <div class="flex items-center justify-between mb-[13px]">
                <span class="text-[13px] font-semibold text-muted">{{
                  t('admin.dashboard.kpi.organisations')
                }}</span>
                <span
                  class="grid place-items-center w-[34px] h-[34px] rounded-[9px] bg-accent-soft text-accent"
                >
                  <mns-icon name="Building" [size]="18" />
                </span>
              </div>
              <div class="mono text-[34px] font-bold leading-none tracking-[-0.02em]">
                <mns-count [to]="s.organisationCount" />
              </div>
              <div class="text-[12.5px] text-muted mt-[13px]">
                {{ t('admin.dashboard.kpi.activeTenants') }}
              </div>
            </mns-card>

            <!-- Users (dual verified/pending readout) -->
            <mns-card [hover]="true">
              <div class="flex items-center justify-between mb-[13px]">
                <span class="text-[13px] font-semibold text-muted">{{
                  t('admin.dashboard.kpi.users')
                }}</span>
                <span
                  class="grid place-items-center w-[34px] h-[34px] rounded-[9px] bg-info-dim text-info"
                >
                  <mns-icon name="User" [size]="18" />
                </span>
              </div>
              <div class="flex items-flex-end gap-[22px]">
                <div>
                  <div class="mono text-[34px] font-bold leading-none text-online">
                    <mns-count [to]="s.users.verified" />
                  </div>
                  <div class="text-[12px] text-muted mt-[3px]">
                    {{ t('admin.dashboard.kpi.verified') }}
                  </div>
                </div>
                <div>
                  <div class="mono text-[34px] font-bold leading-none text-warn">
                    <mns-count [to]="s.users.pending" />
                  </div>
                  <div class="text-[12px] text-muted mt-[3px]">
                    {{ t('admin.dashboard.kpi.pending') }}
                  </div>
                </div>
                <span
                  class="ml-auto text-[12px] font-bold px-[9px] py-[3px] rounded-[99px] bg-surface-3 text-muted self-start"
                >
                  {{ t('admin.dashboard.kpi.total', { count: s.users.total }) }}
                </span>
              </div>
            </mns-card>

            <!-- Storage used (originals + transcoded combined) -->
            <mns-card [hover]="true">
              <div class="flex items-center justify-between mb-[13px]">
                <span class="text-[13px] font-semibold text-muted">{{
                  t('admin.dashboard.kpi.storageUsed')
                }}</span>
                <span
                  class="grid place-items-center w-[34px] h-[34px] rounded-[9px] bg-info-dim text-info"
                >
                  <mns-icon name="Storage" [size]="18" />
                </span>
              </div>
              <div class="mono text-[34px] font-bold leading-none tracking-[-0.02em]">
                {{ formatBytes(s.storage.originalUsedBytes + s.storage.transcodedUsedBytes) }}
              </div>
              <div class="text-[12.5px] text-muted mt-[13px]">
                {{
                  t('admin.dashboard.kpi.ofAllocated', {
                    limit: formatBytes(
                      s.storage.originalLimitBytes + s.storage.transcodedLimitBytes
                    ),
                  })
                }}
              </div>
            </mns-card>

            <!-- Host disk free -->
            <mns-card [hover]="true">
              <div class="flex items-center justify-between mb-[13px]">
                <span class="text-[13px] font-semibold text-muted">{{
                  t('admin.dashboard.kpi.hostDiskFree')
                }}</span>
                <span
                  class="grid place-items-center w-[34px] h-[34px] rounded-[9px] bg-warn-dim text-warn"
                >
                  <mns-icon name="Storage" [size]="18" />
                </span>
              </div>
              @if (s.hostDisk.available) {
                <div class="mono text-[34px] font-bold leading-none tracking-[-0.02em]">
                  {{ formatBytes(s.hostDisk.freeBytes) }}
                </div>
                <div class="text-[12.5px] text-muted mt-[13px]">
                  {{
                    t('admin.dashboard.kpi.ofUsed', {
                      total: formatBytes(s.hostDisk.totalBytes),
                      pct: hostPctLabel(),
                    })
                  }}
                </div>
              } @else {
                <div class="text-muted text-sm">{{ t('admin.dashboard.diskUnavailable') }}</div>
              }
            </mns-card>
          </div>

          <!-- Storage Allocated vs Used + Host Disk -->
          <div
            class="grid gap-[var(--gap)] items-start adm-two"
            style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)"
          >
            <!-- Storage bars + per-org legend placeholder -->
            <mns-card>
              <mns-card-head [title]="t('admin.dashboard.storageAllocated.title')" icon="Storage">
                <mns-badge slot="right" tone="neutral" icon="Building">{{
                  t('admin.dashboard.storageAllocated.allOrganisations')
                }}</mns-badge>
              </mns-card-head>
              <div class="flex flex-col gap-[22px]">
                <!-- Originals -->
                <div>
                  <div class="flex items-center justify-between gap-3 mb-2">
                    <span class="text-[14px] font-bold">{{
                      t('admin.dashboard.storageAllocated.originals')
                    }}</span>
                    <span class="mono text-[13px] text-muted">
                      {{ formatBytes(s.storage.originalUsedBytes) }} /
                      {{ formatBytes(s.storage.originalLimitBytes) }}
                    </span>
                  </div>
                  <mns-bar [value]="origPct()" color="var(--color-info)" [glow]="true" [h]="9" />
                  <div class="mono text-[11.5px] text-faint mt-[6px]">
                    {{ origPct() | localeNumber: '1.1-1' }}%
                  </div>
                </div>
                <!-- Transcoded -->
                <div>
                  <div class="flex items-center justify-between gap-3 mb-2">
                    <span class="text-[14px] font-bold">{{
                      t('admin.dashboard.storageAllocated.transcoded')
                    }}</span>
                    <span class="mono text-[13px] text-muted">
                      {{ formatBytes(s.storage.transcodedUsedBytes) }} /
                      {{ formatBytes(s.storage.transcodedLimitBytes) }}
                    </span>
                  </div>
                  <mns-bar [value]="transPct()" color="var(--accent-2)" [glow]="true" [h]="9" />
                  <div class="mono text-[11.5px] text-faint mt-[6px]">
                    {{ transPct() | localeNumber: '1.1-1' }}%
                  </div>
                </div>
              </div>

              <!-- per-org legend (client-side aggregate) -->
              @if (organisations().length > 0) {
                <div class="mt-[22px] pt-[18px] border-t border-border grid grid-cols-2 gap-[14px]">
                  @for (org of organisations(); track org.id) {
                    <div class="flex items-center gap-[11px] min-w-0">
                      <mns-avatar [name]="org.name" [size]="26" />
                      <div class="min-w-0">
                        <div class="text-[13px] font-bold truncate">{{ org.name }}</div>
                        <div class="mono text-[11.5px] text-muted">
                          {{
                            t('admin.dashboard.orgLegend.usedOf', {
                              used: formatBytes(orgUsed(org)),
                              limit: formatBytes(orgLimit(org)),
                            })
                          }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </mns-card>

            <!-- Host disk ring + bar -->
            <mns-card>
              <mns-card-head [title]="t('admin.dashboard.hostDisk.title')" icon="Storage">
                <mns-badge slot="right" tone="neutral">{{ s.hostDisk.path }}</mns-badge>
              </mns-card-head>
              @if (s.hostDisk.available) {
                <div class="flex items-center gap-[22px]">
                  <mns-ring [value]="hostPct()" [size]="104" [sw]="11" color="var(--color-online)">
                    <div class="text-center">
                      <div class="mono text-[22px] font-bold leading-none">
                        {{ hostPct() | localeNumber: '1.0-0' }}<span class="text-[13px]">%</span>
                      </div>
                      <div class="text-[11px] text-muted mt-[2px]">
                        {{ t('admin.dashboard.hostDisk.used') }}
                      </div>
                    </div>
                  </mns-ring>
                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between text-[13px] mb-1">
                      <span class="font-semibold text-muted">{{
                        t('admin.dashboard.hostDisk.usedLabel')
                      }}</span>
                      <span class="mono">{{ formatBytes(hostUsedBytes()) }}</span>
                    </div>
                    <div class="flex justify-between text-[13px] mb-[10px]">
                      <span class="font-semibold text-muted">{{
                        t('admin.dashboard.hostDisk.freeLabel')
                      }}</span>
                      <span class="mono text-online">{{ formatBytes(s.hostDisk.freeBytes) }}</span>
                    </div>
                    <mns-bar
                      [value]="hostPct()"
                      color="var(--color-online)"
                      [glow]="true"
                      [h]="9"
                    />
                    <div class="mono text-[11.5px] text-faint mt-2">
                      {{
                        t('admin.dashboard.hostDisk.freeOf', {
                          free: formatBytes(s.hostDisk.freeBytes),
                          total: formatBytes(s.hostDisk.totalBytes),
                        })
                      }}
                    </div>
                  </div>
                </div>
              } @else {
                <div class="text-muted text-sm">{{ t('admin.dashboard.diskUnavailable') }}</div>
              }
            </mns-card>
          </div>

          <!-- System load chart -->
          <mns-card>
            <mns-card-head
              [title]="t('admin.dashboard.systemLoad.title')"
              [sub]="t('admin.dashboard.systemLoad.subtitle')"
              icon="Power"
            >
              <mns-badge slot="right" tone="accent" icon="Refresh">{{
                t('admin.dashboard.systemLoad.hourlyAverage')
              }}</mns-badge>
            </mns-card-head>

            <!-- readout strip -->
            <div class="flex items-start gap-[38px] flex-wrap mb-4">
              <!-- CPU -->
              <div class="flex items-center gap-3">
                <span
                  class="w-4 h-1 rounded-[99px] flex-shrink-0"
                  style="background:var(--accent)"
                ></span>
                <div>
                  <div class="text-[12.5px] font-semibold text-muted whitespace-nowrap mb-[2px]">
                    {{ t('admin.dashboard.systemLoad.cpuCores', { cores: load().cores }) }}
                  </div>
                  <div class="flex items-baseline gap-2">
                    <span class="mono text-[26px] font-bold leading-none text-accent"
                      >{{ load().cpuNow }}%</span
                    >
                    <span class="mono text-[12px] text-faint">{{
                      t('admin.dashboard.systemLoad.peak', { pct: load().cpuPeak })
                    }}</span>
                  </div>
                </div>
              </div>
              <!-- RAM -->
              <div class="flex items-center gap-3">
                <span
                  class="w-4 h-1 rounded-[99px] flex-shrink-0"
                  style="background:repeating-linear-gradient(90deg,var(--color-info) 0 5px,transparent 5px 8px)"
                ></span>
                <div>
                  <div class="text-[12.5px] font-semibold text-muted whitespace-nowrap mb-[2px]">
                    {{ t('admin.dashboard.systemLoad.memoryTotal', { total: load().ramTotalGB }) }}
                  </div>
                  <div class="flex items-baseline gap-2">
                    <span class="mono text-[26px] font-bold leading-none text-info"
                      >{{ load().ramNow }}%</span
                    >
                    <span class="mono text-[12px] text-faint">
                      {{
                        t('admin.dashboard.systemLoad.memoryReadout', {
                          used: ramUsedGB(),
                          peak: ramPeakGB(),
                        })
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            @if (hasLoadHistory()) {
              <mns-load-graph [load]="load()" />
            } @else {
              <div class="text-muted text-sm py-6 text-center">
                {{ t('admin.dashboard.systemLoad.collecting') }}
              </div>
            }
          </mns-card>

          <!-- Organisations · Usage at a glance (client-side aggregate) -->
          @if (organisations().length > 0) {
            <mns-card [pad]="false" class="block overflow-hidden">
              <div class="px-[22px] pt-[18px] pb-1">
                <mns-card-head
                  [title]="t('admin.dashboard.orgSnapshot.title')"
                  [sub]="t('admin.dashboard.orgSnapshot.subtitle')"
                  icon="Building"
                />
              </div>
              @for (org of organisations(); track org.id) {
                <div class="flex items-center gap-4 px-[22px] py-[14px] border-t border-border">
                  <mns-avatar [name]="org.name" [size]="36" />
                  <div class="w-[150px] min-w-0">
                    <div class="text-[14px] font-bold truncate">{{ org.name }}</div>
                    <div class="text-[12px] text-muted truncate">{{ org.timeZone }}</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <mns-bar [value]="orgPct(org)" color="var(--accent)" [h]="7" />
                    <div class="mono text-[11px] text-faint mt-[5px]">
                      {{ formatBytes(orgUsed(org)) }} / {{ formatBytes(orgLimit(org)) }}
                    </div>
                  </div>
                </div>
              }
            </mns-card>
          }
        </div>
      }
    </ng-container>
  `,
  styles: `
    @media (max-width: 1100px) {
      .adm-kpi {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      .adm-two {
        grid-template-columns: 1fr !important;
      }
    }
    @media (max-width: 560px) {
      .adm-kpi {
        grid-template-columns: 1fr !important;
      }
    }
  `,
})
export class InstanceDashboard implements OnInit {
  private service = inject(InstanceAdminService);
  private orgService = inject(OrganisationService);
  private transloco = inject(TranslocoService);

  readonly summary = signal<InstanceAdminSummary | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  /** Per-org list, aggregated client-side for the legend + snapshot card. */
  readonly organisations = signal<Organisation[]>([]);

  /** Raw 24h host-load series fetched from the metrics endpoint. */
  readonly systemLoad = signal<SystemLoad | null>(null);

  /**
   * Derives the {@link LoadData} the chart consumes from the fetched series.
   * `transcodeWindows` is empty — transcode timing isn't tracked historically.
   */
  readonly load = computed<LoadData>(() => {
    const data = this.systemLoad();
    const cpu = data?.cpu ?? [];
    const ram = data?.ram ?? [];
    return {
      cpu,
      ram,
      transcodeWindows: [],
      cores: data?.cores ?? 0,
      ramTotalGB: data?.ramTotalGB ?? 0,
      cpuNow: cpu.at(-1) ?? 0,
      ramNow: ram.at(-1) ?? 0,
      cpuPeak: cpu.length ? Math.max(...cpu) : 0,
      ramPeak: ram.length ? Math.max(...ram) : 0,
    };
  });

  /** The chart needs at least two points to draw a line. */
  readonly hasLoadHistory = computed(() => this.load().cpu.length > 1);

  protected readonly formatBytes = formatBytes;

  readonly hostUsedBytes = computed(() => {
    const disk = this.summary()?.hostDisk;
    if (!disk) return 0;
    return Math.max(0, disk.totalBytes - disk.freeBytes);
  });

  readonly hostPct = computed(() => {
    const disk = this.summary()?.hostDisk;
    if (!disk || !disk.totalBytes) return 0;
    return (this.hostUsedBytes() / disk.totalBytes) * 100;
  });

  /** Host-disk percentage formatted to one decimal, for the KPI caption. */
  protected hostPctLabel(): string {
    return this.hostPct().toFixed(1);
  }

  readonly origPct = computed(() => {
    const s = this.summary()?.storage;
    if (!s || !s.originalLimitBytes) return 0;
    return (s.originalUsedBytes / s.originalLimitBytes) * 100;
  });

  readonly transPct = computed(() => {
    const s = this.summary()?.storage;
    if (!s || !s.transcodedLimitBytes) return 0;
    return (s.transcodedUsedBytes / s.transcodedLimitBytes) * 100;
  });

  readonly ramUsedGB = computed(() =>
    ((this.load().ramNow / 100) * this.load().ramTotalGB).toFixed(1),
  );
  readonly ramPeakGB = computed(() =>
    ((this.load().ramPeak / 100) * this.load().ramTotalGB).toFixed(1),
  );

  protected orgUsed(org: Organisation): number {
    return org.storageOriginalUsedBytes + org.storageTranscodedUsedBytes;
  }

  protected orgLimit(org: Organisation): number {
    return org.storageOriginalLimitBytes + org.storageTranscodedLimitBytes;
  }

  protected orgPct(org: Organisation): number {
    const limit = this.orgLimit(org);
    if (limit <= 0) return 0;
    return Math.min((this.orgUsed(org) / limit) * 100, 100);
  }

  ngOnInit(): void {
    this.service.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (err: { status: number }) => {
        this.loadError.set(
          err.status === 403
            ? this.transloco.translate('admin.dashboard.errors.accessDenied')
            : this.transloco.translate('admin.dashboard.errors.loadFailed'),
        );
        this.loading.set(false);
      },
    });

    this.service.getSystemLoad().subscribe({
      next: (load) => this.systemLoad.set(load),
      error: () => {
        /* best-effort — the system-load chart shows a "collecting data" note */
      },
    });

    // Per-org storage list for the legend + snapshot card (client-side aggregate).
    this.orgService.getAll().subscribe({
      next: (orgs) => this.organisations.set(orgs),
      error: () => {
        /* best-effort — the per-org legend / snapshot simply stays hidden */
      },
    });
  }
}
