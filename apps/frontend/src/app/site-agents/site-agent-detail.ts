import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { formatDate } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SiteAgentService } from './site-agent.service';
import { ScreenService } from '../screens/screen.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import { LanguageService } from '../i18n/language.service';
import { ScreenRemoteSettings } from './screen-remote-settings';
import { ScreenOnboardingWizard, ONBOARDING_STEP_COUNT } from './screen-onboarding-wizard';
import { SiteAgentConfirmModal } from './site-agent-confirm-modal';
import { SiteAgentNetwork } from './site-agent-network';
import {
  PROBE_INTERVAL_MAX_MINUTES,
  PROBE_INTERVAL_MIN_MINUTES,
  pendingAppLaunchAt,
  type RemoteCommandType,
  type ScreenRemoteControl,
  type SiteAgent,
  type SiteAgentStatusEvent,
} from './site-agent.model';
import type { ScreenListItem } from '../screens/screen.model';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  CopyButtonComponent,
  EmptyComponent,
  IconComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SelectComponent,
  StatusDotComponent,
  ToggleRowComponent,
} from '../ui';
import { BackLink } from '../shared/back-link';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';

/** A screen paired with what the agent knows about it. */
interface ManagedScreen {
  screen: ScreenListItem;
  remote: ScreenRemoteControl;
}

@Component({
  selector: 'app-site-agent-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BackLink,
    LocaleDatePipe,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    CopyButtonComponent,
    EmptyComponent,
    IconComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SelectComponent,
    StatusDotComponent,
    ToggleRowComponent,
    ScreenRemoteSettings,
    ScreenOnboardingWizard,
    SiteAgentConfirmModal,
    SiteAgentNetwork,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      @if (agent(); as agent) {
        <mns-page-header
          [title]="agent.name"
          [sub]="agent.location || t('siteAgents.detail.siteAgentFallback')"
          icon="Cast"
        >
          <app-back-link route="/site-agents" />
        </mns-page-header>

        <mns-card>
          <div class="flex flex-wrap items-center gap-4">
            <mns-status-dot [status]="agent.isOnline ? 'online' : 'offline'" />
            <div class="flex-1 min-w-[200px]">
              <div class="font-bold">
                {{
                  agent.isOnline
                    ? t('siteAgents.detail.connected')
                    : t('siteAgents.detail.notConnected')
                }}
              </div>
              <div class="text-[13px] text-muted">
                {{ agent.agentVersion || t('siteAgents.detail.versionUnknown') }} ·
                {{
                  agent.lastHeartbeat
                    ? t('siteAgents.detail.lastSeen', {
                        date: agent.lastHeartbeat | localeDate: 'short',
                      })
                    : t('siteAgents.detail.neverChecked')
                }}
              </div>
              <div class="mt-1 text-[13px] text-muted">
                <app-site-agent-network [agent]="agent" />
              </div>
            </div>
            <div class="flex items-center gap-2" data-testid="probe-interval">
              <span class="text-[13px] text-muted">{{ t('siteAgents.detail.probeInterval') }}</span>
              <mns-select
                class="w-28"
                [options]="probeIntervalOptions()"
                [value]="'' + agent.probeIntervalMinutes"
                [ariaLabel]="t('siteAgents.detail.probeInterval')"
                [searchable]="false"
                (changed)="setProbeInterval($event)"
              />
              <mns-btn
                variant="outline"
                icon="Refresh"
                [disabled]="!agent.isOnline || probing()"
                (mnsClick)="probeNow()"
              >
                {{ t('siteAgents.detail.probeNow') }}
              </mns-btn>
            </div>
            <mns-btn icon="Plus" [disabled]="unassigned().length === 0" (mnsClick)="openAssign()">
              {{ t('siteAgents.detail.addDisplay') }}
            </mns-btn>
            <mns-btn variant="outline" icon="Refresh" (mnsClick)="reissue()">
              {{ t('siteAgents.detail.newToken') }}
            </mns-btn>
            <mns-btn variant="outline" icon="Logout" (mnsClick)="revoke()">
              {{ t('siteAgents.detail.revokeAccess') }}
            </mns-btn>
            <mns-btn variant="outline" icon="Trash" (mnsClick)="remove()">
              {{ t('siteAgents.detail.deleteAgent') }}
            </mns-btn>
          </div>

          <div class="mt-4 border-t border-border pt-4" data-testid="subnet-sweep">
            <mns-toggle-row
              [label]="t('siteAgents.detail.subnetSweepLabel')"
              [desc]="t('siteAgents.detail.subnetSweepDesc')"
              [checked]="agent.subnetSweepEnabled"
              (toggled)="setSubnetSweep($event)"
            />
          </div>

          @if (token(); as raw) {
            <div class="mt-4 rounded-lg border border-border-strong bg-surface-2 p-3">
              <div class="flex items-center gap-2">
                <code class="min-w-0 flex-1 break-all font-mono text-[13px]">{{ raw }}</code>
                <mns-copy-button
                  [text]="raw"
                  (copied)="onTokenCopied()"
                  (copyFailed)="onTokenCopyFailed()"
                />
              </div>
              <p class="text-[13px] text-muted mt-2">
                {{ t('siteAgents.detail.tokenHint') }}
              </p>
            </div>
          }
        </mns-card>

        @if (agent.updateAvailable) {
          <!-- Server and agent ship from one release; an agent behind the server
               has an update waiting. The button pulls the new image on the venue
               host and restarts the agent; it has to be online to receive it. -->
          <div
            class="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-[13px]"
            data-testid="agent-update-hint"
          >
            <mns-icon name="Download" [size]="16" class="text-warn mt-0.5" />
            <div class="flex flex-1 flex-col gap-2">
              <span>
                <strong>{{
                  t('siteAgents.detail.updateAvailable', {
                    installed: agent.agentVersion,
                    latest: agent.latestAgentVersion,
                  })
                }}</strong>
                {{ t('siteAgents.detail.updateHint') }}
              </span>
              <div>
                <mns-btn
                  variant="outline"
                  icon="Download"
                  data-testid="agent-update-now"
                  [disabled]="!agent.isOnline || updating()"
                  (mnsClick)="updateNow()"
                >
                  {{ t('siteAgents.detail.updateNow') }}
                </mns-btn>
              </div>
            </div>
          </div>
        }

        @if (!agent.isOnline && managed().length > 0) {
          <!-- A green "reachable" from two days ago is worse than no answer. -->
          <div
            class="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-[13px]"
          >
            <mns-icon name="Alert" [size]="16" class="text-warn mt-0.5" />
            <span>
              {{ t('siteAgents.detail.staleWarning') }}
            </span>
          </div>
        }

        <h2 class="mt-8 mb-3 text-[15px] font-bold">
          {{ t('siteAgents.detail.displaysHeading', { count: managed().length }) }}
        </h2>

        @if (managed().length === 0) {
          <mns-empty
            icon="Screens"
            [title]="t('siteAgents.detail.noDisplaysTitle')"
            [desc]="emptyDesc()"
          />
        } @else {
          <div class="flex flex-col gap-3">
            @for (item of managed(); track item.screen.id) {
              <mns-card>
                <div class="flex flex-wrap items-start gap-3">
                  <mns-status-dot [status]="dotFor(item)" />
                  <div class="flex-1 min-w-[180px]">
                    <div class="font-bold truncate">{{ item.screen.name }}</div>
                    <div class="text-[13px] text-muted">
                      {{ item.remote.localIp || t('siteAgents.detail.noAddress') }} ·
                      {{ statusLabel(item) }}
                    </div>
                  </div>

                  @if (!item.remote.onboardingCompletedAt) {
                    <mns-badge tone="warning">
                      {{
                        t('siteAgents.detail.setupBadge', {
                          step: item.remote.onboardingStep,
                          total: onboardingSteps,
                        })
                      }}
                    </mns-badge>
                  }
                  @if (appUpdateAvailable(item)) {
                    <mns-badge tone="warning">
                      {{
                        t('siteAgents.detail.appUpdateBadge', {
                          installed: item.remote.installedAppVersion,
                          available: item.remote.availableAppVersion,
                        })
                      }}
                    </mns-badge>
                  } @else if (item.remote.installedAppVersion) {
                    <mns-badge tone="neutral">
                      {{
                        t('siteAgents.detail.appBadge', {
                          version: item.remote.installedAppVersion,
                        })
                      }}
                    </mns-badge>
                  }

                  <div class="flex flex-wrap gap-2">
                    @if (!item.remote.onboardingCompletedAt) {
                      <mns-btn size="sm" (mnsClick)="openWizard(item)">
                        {{ t('siteAgents.detail.continueSetup') }}
                      </mns-btn>
                    } @else {
                      <mns-btn size="sm" variant="outline" (mnsClick)="command(item, 'launch')">
                        {{ t('siteAgents.detail.startApp') }}
                      </mns-btn>
                      @if (item.remote.macAddress) {
                        <mns-btn size="sm" variant="outline" (mnsClick)="command(item, 'wake')">
                          {{ t('siteAgents.detail.wake') }}
                        </mns-btn>
                      }
                      <!--
                      Shown only where it can work: the extension runs over SSH,
                      which needs the Developer Mode passphrase stored.
                    -->
                      @if (item.remote.macAddress) {
                        <mns-btn size="sm" variant="outline" (mnsClick)="standby(item)">
                          {{ t('siteAgents.detail.standby') }}
                        </mns-btn>
                      }
                      <!--
                      The install goes over SSH, so it needs the same thing the
                      Developer Mode extension does: a stored passphrase.
                    -->
                      @if (item.remote.devmodePassphrase) {
                        <mns-btn
                          size="sm"
                          [variant]="appUpdateAvailable(item) ? 'soft' : 'outline'"
                          (mnsClick)="command(item, 'install_app')"
                        >
                          {{
                            item.remote.installedAppVersion
                              ? t('siteAgents.detail.updateApp')
                              : t('siteAgents.detail.installApp')
                          }}
                        </mns-btn>
                      }
                      @if (item.remote.extendDevmodeEnabled && item.remote.devmodePassphrase) {
                        <mns-btn
                          size="sm"
                          variant="outline"
                          (mnsClick)="command(item, 'extend_devmode')"
                        >
                          {{ t('siteAgents.detail.extendDevmode') }}
                        </mns-btn>
                      }
                    }
                    <mns-btn
                      size="sm"
                      variant="outline"
                      icon="Settings"
                      (mnsClick)="openSettings(item)"
                    >
                      {{ t('siteAgents.detail.settings') }}
                    </mns-btn>
                    <mns-btn
                      size="sm"
                      variant="outline"
                      icon="Trash"
                      (mnsClick)="removeScreen(item)"
                    >
                      {{ t('siteAgents.detail.remove') }}
                    </mns-btn>
                  </div>
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                  <dt class="text-muted">{{ t('siteAgents.detail.lastProbe') }}</dt>
                  <dd>
                    {{
                      item.remote.lastProbeAt
                        ? (item.remote.lastProbeAt | localeDate: 'short')
                        : '—'
                    }}
                  </dd>
                  <dt class="text-muted">{{ t('siteAgents.detail.developerMode') }}</dt>
                  <dd>{{ devmodeLabel(item) }}</dd>
                  <dt class="text-muted">{{ t('siteAgents.detail.key') }}</dt>
                  <dd>{{ item.remote.keyStatus }}</dd>
                  <dt class="text-muted">{{ t('siteAgents.detail.remote') }}</dt>
                  <dd>{{ item.remote.ssapStatus }}</dd>
                </dl>

                @if (item.remote.lastProbeError) {
                  <p class="mt-2 text-[13px] text-danger">{{ item.remote.lastProbeError }}</p>
                }
              </mns-card>
            }
          </div>
        }

        @if (assignOpen()) {
          <mns-overlay (closed)="closeAssign()">
            <mns-modal
              [title]="t('siteAgents.detail.assignTitle')"
              icon="Screens"
              (closed)="closeAssign()"
            >
              <div class="flex flex-col gap-4">
                <p class="text-[13px] text-muted">
                  {{ t('siteAgents.detail.assignHint') }}
                </p>
                <mns-select
                  [options]="unassignedOptions()"
                  [(value)]="assigning"
                  [placeholder]="t('siteAgents.detail.assignPlaceholder')"
                />
                <div class="flex justify-end gap-2">
                  <mns-btn variant="outline" (mnsClick)="closeAssign()">
                    {{ t('siteAgents.detail.cancel') }}
                  </mns-btn>
                  <mns-btn [disabled]="!assigning()" (mnsClick)="assign()">
                    {{ t('siteAgents.detail.add') }}
                  </mns-btn>
                </div>
              </div>
            </mns-modal>
          </mns-overlay>
        }

        @if (standbyScreen(); as item) {
          <app-site-agent-confirm-modal
            [title]="t('siteAgents.detail.standbyTitle')"
            [confirmLabel]="t('siteAgents.detail.standbyConfirmLabel')"
            [busyLabel]="t('siteAgents.detail.standbyBusyLabel')"
            [busy]="busy()"
            [error]="confirmError()"
            (confirmed)="doStandby(item)"
            (dismiss)="closeConfirm()"
          >
            {{ t('siteAgents.detail.standbyBodyPrefix') }}
            <strong class="text-text">{{ item.screen.name }}</strong>
            {{ t('siteAgents.detail.standbyBodyMiddle') }}
            <strong class="text-text">{{ t('siteAgents.detail.standbyQuickStart') }}</strong>
            {{ t('siteAgents.detail.standbyBodySuffix') }}
          </app-site-agent-confirm-modal>
        }

        @if (removingScreen(); as item) {
          <app-site-agent-confirm-modal
            [title]="t('siteAgents.detail.removeTitle')"
            [confirmLabel]="t('siteAgents.detail.removeConfirmLabel')"
            [busyLabel]="t('siteAgents.detail.removeBusyLabel')"
            [busy]="busy()"
            [error]="confirmError()"
            (confirmed)="doRemoveScreen(item)"
            (dismiss)="closeConfirm()"
          >
            {{ t('siteAgents.detail.removeBodyPrefix') }}
            <strong class="text-text">{{ item.screen.name }}</strong>
            {{ t('siteAgents.detail.removeBodySuffix') }}
          </app-site-agent-confirm-modal>
        }

        @if (confirmingDelete()) {
          <app-site-agent-confirm-modal
            [title]="t('siteAgents.detail.deleteTitle')"
            [confirmLabel]="t('siteAgents.detail.deleteConfirmLabel')"
            [busyLabel]="t('siteAgents.detail.deleteBusyLabel')"
            [busy]="busy()"
            [error]="confirmError()"
            (confirmed)="doRemove()"
            (dismiss)="closeConfirm()"
          >
            {{ t('siteAgents.detail.deleteBodyPrefix') }}
            <strong class="text-text">{{ agent.name }}</strong
            >?
            @if (managed().length > 0) {
              {{ t('siteAgents.detail.deleteBodyReleases', { count: managed().length }) }}
            }
            {{ t('siteAgents.detail.deleteBodySuffix') }}
          </app-site-agent-confirm-modal>
        }

        @if (confirmingRevoke()) {
          <app-site-agent-confirm-modal
            [title]="t('siteAgents.detail.revokeTitle')"
            [confirmLabel]="t('siteAgents.detail.revokeConfirmLabel')"
            [busyLabel]="t('siteAgents.detail.revokeBusyLabel')"
            icon="Logout"
            [busy]="busy()"
            [error]="confirmError()"
            (confirmed)="doRevoke()"
            (dismiss)="closeConfirm()"
          >
            {{ t('siteAgents.detail.revokeBody') }}
          </app-site-agent-confirm-modal>
        }

        @if (settingsFor(); as item) {
          <app-screen-remote-settings
            [screen]="item.screen"
            [remote]="item.remote"
            (closed)="closeSettings()"
            (saved)="onSaved($event)"
          />
        }

        @if (wizardFor(); as item) {
          <app-screen-onboarding-wizard
            [screen]="item.screen"
            [remote]="item.remote"
            (closed)="closeWizard()"
            (changed)="load()"
          />
        }
      } @else {
        <div class="text-sm text-muted py-8 text-center">{{ t('siteAgents.detail.loading') }}</div>
      }
    </ng-container>
  `,
  host: { class: 'block' },
})
export class SiteAgentDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SiteAgentService);
  private readonly screens = inject(ScreenService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly sse = inject(DashboardSseService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  private readonly destroyed$ = new Subject<void>();

  protected readonly agent = signal<SiteAgent | null>(null);
  protected readonly managed = signal<ManagedScreen[]>([]);
  protected readonly token = signal<string | null>(null);
  protected readonly unassigned = signal<ScreenListItem[]>([]);
  protected readonly assignOpen = signal(false);
  protected readonly assigning = signal('');
  protected readonly settingsFor = signal<ManagedScreen | null>(null);
  /** The screen whose removal is being confirmed, if any. */
  protected readonly removingScreen = signal<ManagedScreen | null>(null);
  protected readonly standbyScreen = signal<ManagedScreen | null>(null);
  /** Kept beside the wizard's own list so the badge cannot drift from it. */
  protected readonly onboardingSteps = ONBOARDING_STEP_COUNT;
  protected readonly confirmingDelete = signal(false);
  protected readonly confirmingRevoke = signal(false);
  protected readonly busy = signal(false);
  protected readonly confirmError = signal('');
  protected readonly wizardFor = signal<ManagedScreen | null>(null);
  protected readonly probing = signal(false);
  protected readonly updating = signal(false);

  private readonly agentId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  ngOnInit(): void {
    this.load();

    this.sse.siteAgentStatus$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      const data = event.data as SiteAgentStatusEvent;
      if (data.agentId === this.agentId()) {
        this.agent.update((agent) =>
          agent ? { ...agent, isOnline: data.isOnline, lastHeartbeat: data.lastHeartbeat } : agent,
        );
      }
    });

    this.sse.screenReachability$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      const data = event.data as {
        screenId: string;
        reachability: string;
        lastProbeAt: string;
        appLaunchPlannedAt: string | null;
        /** Only present when the agent found the set under a new address. */
        localIp?: string;
      };
      this.managed.update((items) =>
        items.map((item) =>
          item.screen.id === data.screenId
            ? {
                ...item,
                remote: {
                  ...item.remote,
                  reachability: data.reachability as ScreenRemoteControl['reachability'],
                  lastProbeAt: data.lastProbeAt,
                  appLaunchPlannedAt: data.appLaunchPlannedAt ?? null,
                  ...(data.localIp ? { localIp: data.localIp } : {}),
                },
              }
            : item,
        ),
      );
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  protected load(): void {
    const id = this.agentId();
    const orgId = this.orgState.selectedOrgId();
    if (!id || !orgId) {
      return;
    }

    this.service.getOne(id).subscribe({
      next: (agent) => this.agent.set(agent),
      error: () => {
        this.toast.error(this.transloco.translate('siteAgents.detailToast.loadAgentFailed'));
        void this.router.navigate(['/site-agents']);
      },
    });

    // Remote-control settings are per screen, so the list of this agent's
    // screens is assembled from the screens the organisation has. There are
    // tens of these, not thousands.
    this.screens
      .getAll(orgId)
      .pipe(
        switchMap((screens) =>
          screens.length === 0
            ? of([])
            : forkJoin(
                screens.map((screen) =>
                  this.service.getRemoteControl(screen.id).pipe(
                    // A screen whose settings cannot be read must not hide the
                    // rest of the list.
                    catchError(() => of(null)),
                    switchMap((remote) => of(remote ? { screen, remote } : null)),
                  ),
                ),
              ),
        ),
      )
      .subscribe({
        next: (items) => {
          const pairs = (items as (ManagedScreen | null)[]).filter(
            (item): item is ManagedScreen => item !== null,
          );
          this.managed.set(pairs.filter((item) => item.remote.agentId === id));
          // Everything an agent could still be given. A screen already looked
          // after elsewhere is not offered: moving it is a change to make on
          // that agent, where its settings are.
          this.unassigned.set(
            pairs.filter((item) => item.remote.agentId === null).map((item) => item.screen),
          );
        },
        error: () =>
          this.toast.error(this.transloco.translate('siteAgents.detailToast.loadDisplaysFailed')),
      });
  }

  protected dotFor(item: ManagedScreen): 'online' | 'warning' | 'offline' {
    if (item.screen.isOnline) {
      return 'online';
    }
    return item.remote.reachability === 'reachable' ? 'warning' : 'offline';
  }

  /**
   * The combined state. `isOnline` still means only "the player sent a
   * heartbeat"; what the agent adds is the reason it did not.
   */
  protected statusLabel(item: ManagedScreen): string {
    if (item.screen.isOnline) {
      return this.transloco.translate('siteAgents.detail.statusPlaying');
    }
    const launchAt = pendingAppLaunchAt(item.remote, item.screen.isOnline);
    if (launchAt) {
      return this.transloco.translate('siteAgents.detail.statusLaunchPending', {
        time: formatDate(launchAt, 'shortTime', this.language.locale()),
      });
    }
    switch (item.remote.reachability) {
      case 'reachable':
        return this.transloco.translate('siteAgents.detail.statusAppNotRunning');
      case 'unreachable':
        return this.transloco.translate('siteAgents.detail.statusUnreachable');
      default:
        return this.transloco.translate('siteAgents.detail.statusNotReported');
    }
  }

  protected devmodeLabel(item: ManagedScreen): string {
    if (!item.remote.extendDevmodeEnabled) {
      return this.transloco.translate('siteAgents.detail.devmodeOff');
    }
    if (!item.remote.lastDevmodeExtendAt) {
      return this.transloco.translate('siteAgents.detail.devmodeNeverExtended');
    }
    return item.remote.lastDevmodeExtendOk === false
      ? this.transloco.translate('siteAgents.detail.devmodeLastFailed')
      : this.transloco.translate('siteAgents.detail.devmodeExtended');
  }

  /**
   * Whether the set runs something older than what this server packages.
   *
   * A plain inequality, not a semver comparison: the only versions in play are
   * the ones this repo builds, and "different from what we ship" is exactly the
   * thing worth offering to fix. A downgrade is as much a reason to act.
   */
  protected appUpdateAvailable(item: ManagedScreen): boolean {
    const installed = item.remote.installedAppVersion;
    const available = item.remote.availableAppVersion;
    return !!installed && !!available && installed !== available;
  }

  /**
   * Standby asks first, because it is the one command that can strand a display.
   *
   * Waking it again needs Quick Start+ at the TV, and whether that is on cannot
   * be read remotely — so the dialog names what is at stake and leaves the
   * decision to whoever is asking, rather than blocking on a guess.
   */
  protected standby(item: ManagedScreen): void {
    this.confirmError.set('');
    this.standbyScreen.set(item);
  }

  protected doStandby(item: ManagedScreen): void {
    this.closeConfirm();
    this.command(item, 'standby');
  }

  protected command(item: ManagedScreen, type: RemoteCommandType): void {
    this.service.sendCommand(item.screen.id, type).subscribe({
      next: () =>
        this.toast.success(this.transloco.translate('siteAgents.detailToast.commandSent')),
      error: (error: { status?: number }) =>
        this.toast.error(
          this.transloco.translate(
            error.status === 409
              ? 'siteAgents.detailToast.agentOffline'
              : 'siteAgents.detailToast.commandFailed',
          ),
        ),
    });
  }

  protected probeIntervalOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    for (
      let minutes = PROBE_INTERVAL_MIN_MINUTES;
      minutes <= PROBE_INTERVAL_MAX_MINUTES;
      minutes++
    ) {
      options.push({
        value: String(minutes),
        label: this.transloco.translate('siteAgents.detail.probeIntervalOption', { minutes }),
      });
    }
    return options;
  }

  /** Saved straight away; the backend tells the agent to re-pull its config. */
  protected setProbeInterval(value: string): void {
    const agent = this.agent();
    const minutes = Number(value);
    if (!agent || !Number.isInteger(minutes) || minutes === agent.probeIntervalMinutes) {
      return;
    }
    this.service.update(agent.id, { probeIntervalMinutes: minutes }).subscribe({
      next: (updated) => {
        this.agent.update((current) =>
          current ? { ...current, probeIntervalMinutes: updated.probeIntervalMinutes } : current,
        );
        this.toast.success(this.transloco.translate('siteAgents.detailToast.probeIntervalSaved'));
      },
      error: () => {
        // A fresh object puts the select back on the stored value.
        this.agent.update((current) => (current ? { ...current } : current));
        this.toast.error(this.transloco.translate('siteAgents.detailToast.probeIntervalFailed'));
      },
    });
  }

  /** Saved straight away; the backend tells the agent to re-pull its config. */
  protected setSubnetSweep(enabled: boolean): void {
    const agent = this.agent();
    if (!agent || enabled === agent.subnetSweepEnabled) {
      return;
    }
    this.service.update(agent.id, { subnetSweepEnabled: enabled }).subscribe({
      next: (updated) => {
        this.agent.update((current) =>
          current ? { ...current, subnetSweepEnabled: updated.subnetSweepEnabled } : current,
        );
        this.toast.success(
          this.transloco.translate(
            enabled
              ? 'siteAgents.detailToast.subnetSweepOn'
              : 'siteAgents.detailToast.subnetSweepOff',
          ),
        );
      },
      error: () => {
        // A fresh object puts the switch back on the stored value.
        this.agent.update((current) => (current ? { ...current } : current));
        this.toast.error(this.transloco.translate('siteAgents.detailToast.subnetSweepFailed'));
      },
    });
  }

  /** The results come back as reachability events, which update the list in place. */
  protected probeNow(): void {
    this.probing.set(true);
    this.service.probeNow(this.agentId()).subscribe({
      next: () => {
        this.probing.set(false);
        this.toast.success(this.transloco.translate('siteAgents.detailToast.probeStarted'));
      },
      error: (error: { status?: number }) => {
        this.probing.set(false);
        this.toast.error(
          this.transloco.translate(
            error.status === 409
              ? 'siteAgents.detailToast.agentOffline'
              : 'siteAgents.detailToast.probeFailed',
          ),
        );
      },
    });
  }

  /**
   * The agent updates in place on the venue host; the new version arrives on the
   * next heartbeat, which clears the hint. Nothing to poll for here.
   */
  protected updateNow(): void {
    this.updating.set(true);
    this.service.requestUpdate(this.agentId()).subscribe({
      next: () => {
        this.updating.set(false);
        this.toast.success(this.transloco.translate('siteAgents.detailToast.updateStarted'));
      },
      error: (error: { status?: number }) => {
        this.updating.set(false);
        this.toast.error(
          this.transloco.translate(
            error.status === 409
              ? 'siteAgents.detailToast.agentOffline'
              : 'siteAgents.detailToast.updateFailed',
          ),
        );
      },
    });
  }

  protected emptyDesc(): string {
    return this.unassigned().length > 0
      ? this.transloco.translate('siteAgents.detail.emptyDescAssignable')
      : this.transloco.translate('siteAgents.detail.emptyDescAllAssigned');
  }

  protected unassignedOptions(): { value: string; label: string }[] {
    return this.unassigned().map((screen) => ({ value: screen.id, label: screen.name }));
  }

  protected openAssign(): void {
    this.assigning.set('');
    this.assignOpen.set(true);
  }

  protected closeAssign(): void {
    this.assignOpen.set(false);
  }

  protected assign(): void {
    const screenId = this.assigning();
    this.service.updateRemoteControl(screenId, { agentId: this.agentId() }).subscribe({
      next: () => {
        this.closeAssign();
        this.toast.success(this.transloco.translate('siteAgents.detailToast.added'));
        this.load();
      },
      error: () => this.toast.error(this.transloco.translate('siteAgents.detailToast.addFailed')),
    });
  }

  protected openSettings(item: ManagedScreen): void {
    this.settingsFor.set(item);
  }

  protected closeSettings(): void {
    this.settingsFor.set(null);
  }

  protected onSaved(remote: ScreenRemoteControl): void {
    this.settingsFor.set(null);
    this.managed.update((items) =>
      items.map((item) => (item.screen.id === remote.screenId ? { ...item, remote } : item)),
    );
    // A screen may have been moved to another agent, which changes this list.
    this.load();
  }

  protected openWizard(item: ManagedScreen): void {
    this.wizardFor.set(item);
  }

  protected closeWizard(): void {
    this.wizardFor.set(null);
    this.load();
  }

  protected onTokenCopied(): void {
    this.toast.success(this.transloco.translate('siteAgents.toast.tokenCopied'));
  }

  /** The code is on screen either way, so this is a convenience, not a failure. */
  protected onTokenCopyFailed(): void {
    this.toast.error(this.transloco.translate('siteAgents.toast.tokenCopyFailed'));
  }
  protected reissue(): void {
    this.service.reissueEnrolment(this.agentId()).subscribe({
      next: (result) => this.token.set(result.enrolmentToken),
      error: () => this.toast.error(this.transloco.translate('siteAgents.detailToast.tokenFailed')),
    });
  }

  /**
   * Takes a display away from this agent and forgets everything configured for
   * it. The modal spells that out, because the cost of the action is that the
   * setup has to be walked again.
   */
  protected removeScreen(item: ManagedScreen): void {
    this.confirmError.set('');
    this.removingScreen.set(item);
  }

  protected doRemoveScreen(item: ManagedScreen): void {
    this.busy.set(true);
    this.service.removeRemoteControl(item.screen.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeConfirm();
        this.toast.success(this.transloco.translate('siteAgents.detailToast.removed'));
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.confirmError.set(this.transloco.translate('siteAgents.detailToast.removeFailed'));
      },
    });
  }

  protected remove(): void {
    this.confirmError.set('');
    this.confirmingDelete.set(true);
  }

  protected doRemove(): void {
    this.busy.set(true);
    this.service.remove(this.agentId()).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeConfirm();
        this.toast.success(this.transloco.translate('siteAgents.detailToast.deleted'));
        void this.router.navigate(['/site-agents']);
      },
      error: () => {
        this.busy.set(false);
        this.confirmError.set(this.transloco.translate('siteAgents.detailToast.deleteFailed'));
      },
    });
  }

  protected revoke(): void {
    this.confirmError.set('');
    this.confirmingRevoke.set(true);
  }

  protected doRevoke(): void {
    this.busy.set(true);
    this.service.revoke(this.agentId()).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeConfirm();
        this.toast.success(this.transloco.translate('siteAgents.detailToast.revoked'));
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.confirmError.set(this.transloco.translate('siteAgents.detailToast.revokeFailed'));
      },
    });
  }

  protected closeConfirm(): void {
    this.removingScreen.set(null);
    this.standbyScreen.set(null);
    this.confirmingDelete.set(false);
    this.confirmingRevoke.set(false);
    this.confirmError.set('');
  }
}
