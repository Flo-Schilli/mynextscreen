import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Subject, catchError, of, switchMap, timer } from 'rxjs';
import { BadgeComponent, BtnComponent, CardComponent } from '../ui';
import type { BadgeTone } from '../ui';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { ToastService } from '../shared/toast/toast.service';
import { CapturePluginAcceptanceModal } from './capture-plugin-acceptance-modal';
import { CapturePluginService } from './capture-plugin.service';
import { SiteAgentConfirmModal } from './site-agent-confirm-modal';
import type { CapturePluginState, CapturePluginStatus } from './site-agent.model';

/** How often the status is re-read while the page is open. */
export const CAPTURE_STATUS_POLL_MS = 10_000;

const ORG_ADMIN_ROLE = 'org_admin';
const NDI_HOME_URL = 'https://ndi.video';

const STATE_TONE: Record<CapturePluginState, BadgeTone> = {
  absent: 'neutral',
  license_required: 'warning',
  ready: 'online',
  error: 'offline',
  incompatible: 'offline',
};

/**
 * "Video capture plugin (NDI®-compatible)" card of the site-agent page: what
 * the plugin reports and, for organisation admins, the license acceptance.
 * Polls the status while mounted and re-reads it after every action.
 */
@Component({
  selector: 'app-capture-plugin-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BtnComponent,
    CardComponent,
    LocaleDatePipe,
    CapturePluginAcceptanceModal,
    SiteAgentConfirmModal,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <mns-card data-testid="capture-plugin-card">
        <div class="flex flex-wrap items-start gap-3">
          <div class="min-w-[220px] flex-1">
            <div class="font-bold">{{ t('siteAgents.capture.title') }}</div>
            <div class="text-[13px] text-muted">{{ t('siteAgents.capture.platform') }}</div>
          </div>
          @if (status()) {
            <mns-badge [tone]="tone()" data-testid="capture-state">{{ stateLabel() }}</mns-badge>
          }
        </div>

        @if (status(); as s) {
          <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
            <dt class="text-muted">{{ t('siteAgents.capture.pluginVersion') }}</dt>
            <dd data-testid="capture-plugin-version">{{ s.pluginVersion || '–' }}</dd>
            <dt class="text-muted">{{ t('siteAgents.capture.sdkVersion') }}</dt>
            <dd data-testid="capture-sdk-version">{{ s.sdkVersion || '–' }}</dd>
            <dt class="text-muted">{{ t('siteAgents.capture.lastReport') }}</dt>
            <dd data-testid="capture-reported-at">
              {{
                s.reportedAt ? (s.reportedAt | localeDate: 'short') : t('siteAgents.capture.never')
              }}
            </dd>
          </dl>

          @if (s.acceptance; as a) {
            <p class="mt-3 mb-0 text-[13px]" data-testid="capture-acceptance">
              @if (a.source === 'device') {
                {{
                  t('siteAgents.capture.acceptedDevice', {
                    date: a.acceptedAt | localeDate: 'short',
                  })
                }}
              } @else {
                {{
                  t('siteAgents.capture.acceptedBy', {
                    name: a.acceptedBy?.name ?? '–',
                    date: a.acceptedAt | localeDate: 'short',
                  })
                }}
              }
            </p>
          }

          @if (s.state === 'license_required' && !s.licenseTextAvailable) {
            <p class="mt-3 mb-0 text-[13px] text-muted" data-testid="capture-waiting">
              {{ t('siteAgents.capture.waitingForText') }}
            </p>
          }
          @if (s.acceptance?.source === 'device' && isAdmin()) {
            <p class="mt-3 mb-0 text-[13px] text-muted" data-testid="capture-device-hint">
              {{ t('siteAgents.capture.deviceManaged') }}
            </p>
          }

          <div class="mt-3 flex flex-wrap items-center gap-2">
            @if (canEnable()) {
              <mns-btn icon="Check" data-testid="capture-enable" (mnsClick)="accepting.set(true)">
                {{ t('siteAgents.capture.enable') }}
              </mns-btn>
            }
            @if (canRevoke()) {
              <mns-btn
                variant="outline"
                icon="Logout"
                data-testid="capture-revoke"
                (mnsClick)="confirmingRevoke.set(true)"
              >
                {{ t('siteAgents.capture.revoke') }}
              </mns-btn>
            }
          </div>
        } @else if (loadFailed()) {
          <p class="mt-3 mb-0 text-[13px] text-offline" data-testid="capture-load-failed">
            {{ t('siteAgents.capture.loadFailed') }}
          </p>
        }

        <p class="mt-3 mb-0 text-[11px] text-muted">
          {{ t('siteAgents.capture.trademark') }}
          <a class="underline" [href]="ndiHomeUrl" target="_blank" rel="noopener noreferrer"
            >ndi.video</a
          >
        </p>
      </mns-card>

      @if (accepting()) {
        <app-capture-plugin-acceptance-modal
          [agentId]="agentId()"
          [organisation]="organisationName()"
          (accepted)="onAccepted()"
          (stale)="refresh$.next()"
          (dismiss)="accepting.set(false)"
        />
      }

      @if (confirmingRevoke()) {
        <app-site-agent-confirm-modal
          [title]="t('siteAgents.capture.revokeTitle')"
          [confirmLabel]="t('siteAgents.capture.revoke')"
          icon="Logout"
          [busy]="revoking()"
          [error]="revokeError()"
          (confirmed)="revoke()"
          (dismiss)="confirmingRevoke.set(false)"
        >
          {{ t('siteAgents.capture.revokeBody') }}
        </app-site-agent-confirm-modal>
      }
    </ng-container>
  `,
  host: { class: 'mt-4 block' },
})
export class CapturePluginCard implements OnInit {
  readonly agentId = input.required<string>();

  private readonly service = inject(CapturePluginService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ndiHomeUrl = NDI_HOME_URL;
  protected readonly status = signal<CapturePluginStatus | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly accepting = signal(false);
  protected readonly confirmingRevoke = signal(false);
  protected readonly revoking = signal(false);
  protected readonly revokeError = signal('');

  /** Pushing here re-reads the status immediately and restarts the poll interval. */
  protected readonly refresh$ = new Subject<void>();

  protected readonly isAdmin = computed(
    () => this.orgState.isSuperAdmin() || this.orgState.selectedOrg()?.role === ORG_ADMIN_ROLE,
  );
  protected readonly organisationName = computed(() => this.orgState.selectedOrg()?.name ?? '');
  protected readonly tone = computed(() => STATE_TONE[this.status()?.state ?? 'absent']);
  protected readonly canEnable = computed(() => {
    const s = this.status();
    return this.isAdmin() && s?.state === 'license_required' && s.licenseTextAvailable;
  });
  protected readonly canRevoke = computed(
    () => this.isAdmin() && this.status()?.acceptance?.source === 'dashboard',
  );

  ngOnInit(): void {
    this.refresh$
      .pipe(
        switchMap(() => timer(0, CAPTURE_STATUS_POLL_MS)),
        switchMap(() =>
          this.service.getStatus(this.agentId()).pipe(
            catchError(() => {
              this.loadFailed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((status) => {
        if (status) {
          this.loadFailed.set(false);
          this.status.set(status);
        }
      });
    this.refresh$.next();
  }

  protected stateLabel(): string {
    const s = this.status();
    if (!s) return '';
    if (s.state === 'error' && s.errorCode) {
      return this.transloco.translate('siteAgents.capture.state.errorCode', { code: s.errorCode });
    }
    return this.transloco.translate(`siteAgents.capture.state.${s.state}`);
  }

  protected onAccepted(): void {
    this.accepting.set(false);
    this.refresh$.next();
  }

  protected revoke(): void {
    this.revoking.set(true);
    this.revokeError.set('');
    this.service.revoke(this.agentId()).subscribe({
      next: () => {
        this.revoking.set(false);
        this.confirmingRevoke.set(false);
        this.toast.success(this.transloco.translate('siteAgents.capture.toast.revoked'));
        this.refresh$.next();
      },
      error: () => {
        this.revoking.set(false);
        this.revokeError.set(this.transloco.translate('siteAgents.capture.toast.revokeFailed'));
      },
    });
  }
}
