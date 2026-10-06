import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Subject, takeUntil } from 'rxjs';
import { SiteAgentService } from './site-agent.service';
import type { CreatedSiteAgent, SiteAgentListItem, SiteAgentStatusEvent } from './site-agent.model';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  CopyButtonComponent,
  EmptyComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SFieldComponent,
  SInputComponent,
  StatusDotComponent,
} from '../ui';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';

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
    LocaleDatePipe,
    RouterLink,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    CopyButtonComponent,
    EmptyComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SFieldComponent,
    SInputComponent,
    StatusDotComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <mns-page-header
        [title]="t('siteAgents.list.title')"
        [sub]="t('siteAgents.list.subtitle')"
        icon="Cast"
      >
        <mns-btn icon="Plus" (mnsClick)="openCreate()">{{ t('siteAgents.list.addAgent') }}</mns-btn>
      </mns-page-header>

      @if (loading()) {
        <div class="text-sm text-muted py-8 text-center">{{ t('siteAgents.list.loading') }}</div>
      } @else if (agents().length === 0) {
        <mns-empty
          icon="Cast"
          [title]="t('siteAgents.list.emptyTitle')"
          [desc]="t('siteAgents.list.emptyDesc')"
        >
          <mns-btn icon="Plus" (mnsClick)="openCreate()">{{
            t('siteAgents.list.addAgent')
          }}</mns-btn>
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
                      {{ agent.location || t('siteAgents.list.noLocation') }}
                    </div>
                  </div>
                  <mns-badge [tone]="agent.isOnline ? 'online' : 'offline'">
                    {{
                      agent.isOnline ? t('siteAgents.list.connected') : t('siteAgents.list.offline')
                    }}
                  </mns-badge>
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                  <dt class="text-muted">{{ t('siteAgents.list.displays') }}</dt>
                  <dd>{{ agent.screenCount }}</dd>
                  <dt class="text-muted">{{ t('siteAgents.list.version') }}</dt>
                  <dd>{{ agent.agentVersion || '—' }}</dd>
                  <dt class="text-muted">{{ t('siteAgents.list.lastSeen') }}</dt>
                  <dd>
                    {{
                      agent.lastHeartbeat
                        ? (agent.lastHeartbeat | localeDate: 'short')
                        : t('siteAgents.list.never')
                    }}
                  </dd>
                </dl>
              </mns-card>
            </a>
          }
        </div>
      }

      @if (createOpen()) {
        <mns-overlay (closed)="closeCreate()">
          <mns-modal [title]="t('siteAgents.create.title')" icon="Cast" (closed)="closeCreate()">
            @if (issued(); as code) {
              <div class="space-y-4" data-testid="setup-code">
                <p class="text-sm">
                  <strong>{{ code.agent.name }}</strong> {{ t('siteAgents.create.readyPrefix') }}
                </p>
                <!-- Shown once and never again: the server stores only its hash. -->
                <div
                  class="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 py-1.5 pl-3 pr-1.5"
                >
                  <code class="min-w-0 flex-1 break-all font-mono text-[13px]">{{
                    code.enrolmentToken
                  }}</code>
                  <mns-copy-button
                    [text]="code.enrolmentToken"
                    (copied)="onTokenCopied()"
                    (copyFailed)="onTokenCopyFailed()"
                  />
                </div>
                <p class="text-[13px] text-muted">
                  {{
                    t('siteAgents.create.tokenHint', { date: code.expiresAt | localeDate: 'short' })
                  }}
                </p>
                <div class="flex justify-end gap-2">
                  <mns-btn (mnsClick)="closeCreate()">{{ t('siteAgents.create.done') }}</mns-btn>
                </div>
              </div>
            } @else {
              <div class="flex flex-col gap-4">
                <mns-sfield
                  [label]="t('siteAgents.create.nameLabel')"
                  [hint]="t('siteAgents.create.nameHint')"
                >
                  <mns-sinput
                    [(value)]="newName"
                    [placeholder]="t('siteAgents.create.namePlaceholder')"
                  />
                </mns-sfield>
                <mns-sfield
                  [label]="t('siteAgents.create.locationLabel')"
                  [hint]="t('siteAgents.create.locationHint')"
                >
                  <mns-sinput
                    [(value)]="newLocation"
                    [placeholder]="t('siteAgents.create.locationPlaceholder')"
                  />
                </mns-sfield>
                <div class="flex justify-end gap-2">
                  <mns-btn variant="outline" (mnsClick)="closeCreate()">
                    {{ t('siteAgents.create.cancel') }}
                  </mns-btn>
                  <mns-btn [disabled]="creating() || !newName().trim()" (mnsClick)="create()">
                    {{
                      creating() ? t('siteAgents.create.creating') : t('siteAgents.create.create')
                    }}
                  </mns-btn>
                </div>
              </div>
            }
          </mns-modal>
        </mns-overlay>
      }
    </ng-container>
  `,
  host: { class: 'block' },
})
export class SiteAgents implements OnInit, OnDestroy {
  private readonly service = inject(SiteAgentService);
  private readonly sse = inject(DashboardSseService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
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
      const data = event.data as SiteAgentStatusEvent;
      this.agents.update((agents) =>
        agents.map((agent) =>
          agent.id === data.agentId
            ? { ...agent, isOnline: data.isOnline, lastHeartbeat: data.lastHeartbeat }
            : agent,
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
          this.toast.error(this.transloco.translate('siteAgents.toast.createFailed'));
        },
      });
  }

  protected onTokenCopied(): void {
    this.toast.success(this.transloco.translate('siteAgents.toast.tokenCopied'));
  }

  /** The code is on screen either way, so this is a convenience, not a failure. */
  protected onTokenCopyFailed(): void {
    this.toast.error(this.transloco.translate('siteAgents.toast.tokenCopyFailed'));
  }

  private load(): void {
    this.service.getAll().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.transloco.translate('siteAgents.toast.loadFailed'));
      },
    });
  }
}
