import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SiteAgentService } from './site-agent.service';
import type { CreatedSiteAgent, SiteAgentListItem } from './site-agent.model';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  EmptyComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SFieldComponent,
  SInputComponent,
  StatusDotComponent,
} from '../ui';

/**
 * The venues this organisation has an on-premise agent in.
 *
 * Its own top-level entry rather than a settings tab: an agent is infrastructure
 * an operator checks on, not a preference they set once.
 */
@Component({
  selector: 'app-site-agents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    EmptyComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SFieldComponent,
    SInputComponent,
    StatusDotComponent,
  ],
  template: `
    <mns-page-header
      title="Site Agents"
      sub="Services inside your venues that look after the displays"
      icon="Cast"
    >
      <mns-btn icon="Plus" (mnsClick)="openCreate()">Add an agent</mns-btn>
    </mns-page-header>

    @if (loading()) {
      <div class="text-sm text-muted py-8 text-center">Loading…</div>
    } @else if (agents().length === 0) {
      <mns-empty
        icon="Cast"
        title="No site agents yet"
        desc="A site agent runs inside a venue and starts the displays, wakes them before a schedule and keeps their developer mode alive."
      >
        <mns-btn icon="Plus" (mnsClick)="openCreate()">Add an agent</mns-btn>
      </mns-empty>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        @for (agent of agents(); track agent.id) {
          <a [routerLink]="['/site-agents', agent.id]" class="block">
            <mns-card>
              <div class="flex items-start gap-3">
                <mns-status-dot [status]="agent.isOnline ? 'online' : 'offline'" />
                <div class="flex-1 min-w-0">
                  <div class="font-bold truncate">{{ agent.name }}</div>
                  <div class="text-[13px] text-muted truncate">
                    {{ agent.location || 'No location set' }}
                  </div>
                </div>
                <mns-badge [tone]="agent.isOnline ? 'online' : 'offline'">
                  {{ agent.isOnline ? 'connected' : 'offline' }}
                </mns-badge>
              </div>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <dt class="text-muted">Displays</dt>
                <dd>{{ agent.screenCount }}</dd>
                <dt class="text-muted">Version</dt>
                <dd>{{ agent.agentVersion || '—' }}</dd>
                <dt class="text-muted">Last seen</dt>
                <dd>
                  {{ agent.lastHeartbeat ? (agent.lastHeartbeat | date: 'short') : 'never' }}
                </dd>
              </dl>
            </mns-card>
          </a>
        }
      </div>
    }

    @if (createOpen()) {
      <mns-overlay (closed)="closeCreate()">
        <mns-modal title="Add a site agent" icon="Cast" (closed)="closeCreate()">
          @if (issued(); as code) {
            <div class="space-y-4" data-testid="setup-code">
              <p class="text-sm">
                <strong>{{ code.agent.name }}</strong> is ready. Start the agent in the venue and
                enter this setup code on its setup page.
              </p>
              <!-- Shown once and never again: the server stores only its hash. -->
              <div class="rounded-lg border border-border-strong bg-surface-2 p-3">
                <code class="block break-all font-mono text-[13px]">{{ code.enrolmentToken }}</code>
              </div>
              <p class="text-[13px] text-muted">
                It can only be used once and expires {{ code.expiresAt | date: 'short' }}. Copy it
                now — it cannot be shown again, but you can issue a new one.
              </p>
              <div class="flex justify-end gap-2">
                <mns-btn variant="outline" icon="Check" (mnsClick)="copyToken(code.enrolmentToken)">
                  Copy
                </mns-btn>
                <mns-btn (mnsClick)="closeCreate()">Done</mns-btn>
              </div>
            </div>
          } @else {
            <div class="flex flex-col gap-4">
              <mns-sfield label="Name" hint="How you will recognise this venue in the list">
                <mns-sinput [(value)]="newName" placeholder="Venue North" />
              </mns-sfield>
              <mns-sfield label="Location" hint="Optional, e.g. where the machine stands">
                <mns-sinput [(value)]="newLocation" placeholder="Server room" />
              </mns-sfield>
              <div class="flex justify-end gap-2">
                <mns-btn variant="outline" (mnsClick)="closeCreate()">Cancel</mns-btn>
                <mns-btn [disabled]="creating() || !newName().trim()" (mnsClick)="create()">
                  {{ creating() ? 'Creating…' : 'Create' }}
                </mns-btn>
              </div>
            </div>
          }
        </mns-modal>
      </mns-overlay>
    }
  `,
  host: { class: 'block' },
})
export class SiteAgents implements OnInit, OnDestroy {
  private readonly service = inject(SiteAgentService);
  private readonly sse = inject(DashboardSseService);
  private readonly toast = inject(ToastService);
  private readonly destroyed$ = new Subject<void>();

  // OnPush plus zone.js does not mark this component dirty when an HTTP
  // callback mutates a plain field, so all callback-set state lives in signals.
  protected readonly agents = signal<SiteAgentListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly issued = signal<CreatedSiteAgent | null>(null);
  protected readonly newName = signal('');
  protected readonly newLocation = signal('');

  ngOnInit(): void {
    this.load();
    // An agent going offline is the thing an operator most wants to see without
    // reloading, so the list follows the stream it already has open.
    this.sse.siteAgentStatus$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      const data = event.data as { agentId: string; isOnline: boolean };
      this.agents.update((agents) =>
        agents.map((agent) =>
          agent.id === data.agentId ? { ...agent, isOnline: data.isOnline } : agent,
        ),
      );
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  protected openCreate(): void {
    this.issued.set(null);
    this.newName.set('');
    this.newLocation.set('');
    this.createOpen.set(true);
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
    this.issued.set(null);
  }

  protected create(): void {
    this.creating.set(true);
    this.service
      .create({ name: this.newName().trim(), location: this.newLocation().trim() || null })
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.issued.set(created);
          this.load();
        },
        error: () => {
          this.creating.set(false);
          this.toast.error('Could not create the agent');
        },
      });
  }

  protected async copyToken(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.toast.success('Setup code copied');
    } catch {
      // Clipboard access is denied in plenty of contexts; the code is on screen
      // either way, so this is a convenience, not a failure.
      this.toast.error('Could not copy — select the setup code and copy it by hand');
    }
  }

  private load(): void {
    this.service.getAll().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load the site agents');
      },
    });
  }
}
