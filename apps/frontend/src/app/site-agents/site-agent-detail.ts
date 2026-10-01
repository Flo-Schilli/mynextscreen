import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SiteAgentService } from './site-agent.service';
import { ScreenService } from '../screens/screen.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import { ScreenRemoteSettings } from './screen-remote-settings';
import { ScreenOnboardingWizard } from './screen-onboarding-wizard';
import type { RemoteCommandType, ScreenRemoteControl, SiteAgent } from './site-agent.model';
import type { ScreenListItem } from '../screens/screen.model';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  EmptyComponent,
  IconComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SelectComponent,
  StatusDotComponent,
} from '../ui';

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
    DatePipe,
    RouterLink,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    EmptyComponent,
    IconComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SelectComponent,
    StatusDotComponent,
    ScreenRemoteSettings,
    ScreenOnboardingWizard,
  ],
  template: `
    @if (agent(); as agent) {
      <mns-page-header [title]="agent.name" [sub]="agent.location || 'Site agent'" icon="Cast">
        <a routerLink="/site-agents"
          ><mns-btn variant="outline" icon="ChevronLeft">Back</mns-btn></a
        >
      </mns-page-header>

      <mns-card>
        <div class="flex flex-wrap items-center gap-4">
          <mns-status-dot [status]="agent.isOnline ? 'online' : 'offline'" />
          <div class="flex-1 min-w-[200px]">
            <div class="font-bold">{{ agent.isOnline ? 'Connected' : 'Not connected' }}</div>
            <div class="text-[13px] text-muted">
              {{ agent.agentVersion || 'version unknown' }} ·
              {{
                agent.lastHeartbeat
                  ? 'last seen ' + (agent.lastHeartbeat | date: 'short')
                  : 'never checked in'
              }}
            </div>
          </div>
          <mns-btn icon="Plus" [disabled]="unassigned().length === 0" (mnsClick)="openAssign()">
            Add a display
          </mns-btn>
          <mns-btn variant="outline" icon="Refresh" (mnsClick)="reissue()">New token</mns-btn>
          <mns-btn variant="outline" icon="Logout" (mnsClick)="revoke()">Revoke access</mns-btn>
          <mns-btn variant="outline" icon="Trash" (mnsClick)="remove()">Delete agent</mns-btn>
        </div>

        @if (token(); as raw) {
          <div class="mt-4 rounded-lg border border-border-strong bg-surface-2 p-3">
            <code class="block break-all font-mono text-[13px]">{{ raw }}</code>
            <p class="text-[13px] text-muted mt-2">
              Enter this in the agent's setup page. It can only be used once and is not shown again.
            </p>
          </div>
        }
      </mns-card>

      @if (!agent.isOnline && managed().length > 0) {
        <!-- A green "reachable" from two days ago is worse than no answer. -->
        <div
          class="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-[13px]"
        >
          <mns-icon name="Alert" [size]="16" class="text-warn mt-0.5" />
          <span>
            This agent is not connected, so everything below is the last thing it reported, not the
            current state.
          </span>
        </div>
      }

      <h2 class="mt-8 mb-3 text-[15px] font-bold">Displays ({{ managed().length }})</h2>

      @if (managed().length === 0) {
        <mns-empty icon="Screens" title="No displays assigned" [desc]="emptyDesc()" />
      } @else {
        <div class="space-y-3">
          @for (item of managed(); track item.screen.id) {
            <mns-card>
              <div class="flex flex-wrap items-start gap-3">
                <mns-status-dot [status]="dotFor(item)" />
                <div class="flex-1 min-w-[180px]">
                  <div class="font-bold truncate">{{ item.screen.name }}</div>
                  <div class="text-[13px] text-muted">
                    {{ item.remote.localIp || 'no address' }} · {{ statusLabel(item) }}
                  </div>
                </div>

                @if (!item.remote.onboardingCompletedAt) {
                  <mns-badge tone="warning"> Setup {{ item.remote.onboardingStep }}/8 </mns-badge>
                }

                <div class="flex flex-wrap gap-2">
                  @if (!item.remote.onboardingCompletedAt) {
                    <mns-btn size="sm" (mnsClick)="openWizard(item)">Continue setup</mns-btn>
                  } @else {
                    <mns-btn size="sm" variant="outline" (mnsClick)="command(item, 'launch')">
                      Start app
                    </mns-btn>
                    @if (item.remote.macAddress) {
                      <mns-btn size="sm" variant="outline" (mnsClick)="command(item, 'wake')">
                        Wake
                      </mns-btn>
                    }
                  }
                  <mns-btn
                    size="sm"
                    variant="outline"
                    icon="Settings"
                    (mnsClick)="openSettings(item)"
                  >
                    Settings
                  </mns-btn>
                </div>
              </div>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                <dt class="text-muted">Last probe</dt>
                <dd>
                  {{ item.remote.lastProbeAt ? (item.remote.lastProbeAt | date: 'short') : '—' }}
                </dd>
                <dt class="text-muted">Developer mode</dt>
                <dd>{{ devmodeLabel(item) }}</dd>
                <dt class="text-muted">Key</dt>
                <dd>{{ item.remote.keyStatus }}</dd>
                <dt class="text-muted">Remote</dt>
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
          <mns-modal title="Add a display" icon="Screens" (closed)="closeAssign()">
            <div class="space-y-4">
              <p class="text-[13px] text-muted">
                The agent will start probing it straight away. Its address and developer-mode
                passphrase are set afterwards, in the display's settings.
              </p>
              <mns-select
                [options]="unassignedOptions()"
                [(value)]="assigning"
                placeholder="Pick a display"
              />
              <div class="flex justify-end gap-2">
                <mns-btn variant="outline" (mnsClick)="closeAssign()">Cancel</mns-btn>
                <mns-btn [disabled]="!assigning()" (mnsClick)="assign()">Add</mns-btn>
              </div>
            </div>
          </mns-modal>
        </mns-overlay>
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
      <div class="text-sm text-muted py-8 text-center">Loading…</div>
    }
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
  private readonly destroyed$ = new Subject<void>();

  protected readonly agent = signal<SiteAgent | null>(null);
  protected readonly managed = signal<ManagedScreen[]>([]);
  protected readonly token = signal<string | null>(null);
  protected readonly unassigned = signal<ScreenListItem[]>([]);
  protected readonly assignOpen = signal(false);
  protected readonly assigning = signal('');
  protected readonly settingsFor = signal<ManagedScreen | null>(null);
  protected readonly wizardFor = signal<ManagedScreen | null>(null);

  private readonly agentId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  ngOnInit(): void {
    this.load();

    this.sse.siteAgentStatus$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      const data = event.data as { agentId: string; isOnline: boolean };
      if (data.agentId === this.agentId()) {
        this.agent.update((agent) => (agent ? { ...agent, isOnline: data.isOnline } : agent));
      }
    });

    this.sse.screenReachability$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      const data = event.data as { screenId: string; reachability: string; lastProbeAt: string };
      this.managed.update((items) =>
        items.map((item) =>
          item.screen.id === data.screenId
            ? {
                ...item,
                remote: {
                  ...item.remote,
                  reachability: data.reachability as ScreenRemoteControl['reachability'],
                  lastProbeAt: data.lastProbeAt,
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
        this.toast.error('Could not load this agent');
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
        error: () => this.toast.error('Could not load the displays'),
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
      return 'playing';
    }
    switch (item.remote.reachability) {
      case 'reachable':
        return 'TV is on, app is not running';
      case 'unreachable':
        return 'TV does not answer';
      default:
        return 'not reported yet';
    }
  }

  protected devmodeLabel(item: ManagedScreen): string {
    if (!item.remote.extendDevmodeEnabled) {
      return 'off';
    }
    if (!item.remote.lastDevmodeExtendAt) {
      return 'never extended';
    }
    return item.remote.lastDevmodeExtendOk === false ? 'last attempt failed' : 'extended';
  }

  protected command(item: ManagedScreen, type: RemoteCommandType): void {
    this.service.sendCommand(item.screen.id, type).subscribe({
      next: () => this.toast.success('Sent to the agent'),
      error: (error: { status?: number }) =>
        this.toast.error(
          error.status === 409
            ? 'The agent is not connected right now'
            : 'Could not reach the agent',
        ),
    });
  }

  protected emptyDesc(): string {
    return this.unassigned().length > 0
      ? "Use 'Add a display' above to have this agent look after one."
      : 'Every display is already looked after by an agent.';
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
        this.toast.success('Added to this agent');
        this.load();
      },
      error: () => this.toast.error('Could not add that display'),
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

  protected reissue(): void {
    this.service.reissueEnrolment(this.agentId()).subscribe({
      next: (result) => this.token.set(result.enrolmentToken),
      error: () => this.toast.error('Could not issue a token'),
    });
  }

  /**
   * Takes a display away from this agent and forgets everything configured for
   * it. Spelled out in the prompt, because the address, the passphrase and the
   * onboarding progress go too — adding it back walks the operator through the
   * set again rather than trusting what was true of a previous installation.
   */
  protected removeScreen(item: ManagedScreen): void {
    if (
      !confirm(
        `Remove ${item.screen.name} from this agent?\n\n` +
          'Its address, developer-mode passphrase and setup progress are forgotten. ' +
          'Adding it again starts the setup from the beginning.',
      )
    ) {
      return;
    }
    this.service.removeRemoteControl(item.screen.id).subscribe({
      next: () => {
        this.toast.success('Removed from this agent');
        this.load();
      },
      error: () => this.toast.error('Could not remove that display'),
    });
  }

  protected remove(): void {
    const count = this.managed().length;
    if (
      !confirm(
        'Delete this agent?\n\n' +
          (count > 0
            ? `The ${count} display(s) it looks after are released and their setup is forgotten. `
            : '') +
          'This cannot be undone.',
      )
    ) {
      return;
    }
    this.service.remove(this.agentId()).subscribe({
      next: () => {
        this.toast.success('Agent deleted');
        void this.router.navigate(['/site-agents']);
      },
      error: () => this.toast.error('Could not delete this agent'),
    });
  }

  protected revoke(): void {
    if (!confirm('Revoke this agent’s access? It will need a new token to come back.')) {
      return;
    }
    this.service.revoke(this.agentId()).subscribe({
      next: () => {
        this.toast.success('Access revoked');
        this.load();
      },
      error: () => this.toast.error('Could not revoke access'),
    });
  }
}
