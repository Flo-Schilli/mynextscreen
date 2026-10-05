import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { SiteAgentService } from './site-agent.service';
import { ToastService } from '../shared/toast/toast.service';
import {
  DEVMODE_INTERVAL_MAX_DAYS,
  DEVMODE_INTERVAL_MIN_DAYS,
  DEVMODE_INTERVAL_WARN_DAYS,
  MASKED_SECRET,
  type ScreenRemoteControl,
  type SiteAgentListItem,
  type UpdateScreenRemoteControlRequest,
} from './site-agent.model';
import type { ScreenListItem } from '../screens/screen.model';
import {
  BtnComponent,
  ModalComponent,
  OverlayComponent,
  SFieldComponent,
  SInputComponent,
  SelectComponent,
  ToggleRowComponent,
} from '../ui';

/**
 * Remote-control settings for one display.
 *
 * Its own component rather than a section of `screen-form.ts`, which is already
 * 790 lines against a 800-line limit — and these settings belong to the agent's
 * world, not to how a screen is paired.
 */
@Component({
  selector: 'app-screen-remote-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnComponent,
    ModalComponent,
    OverlayComponent,
    SFieldComponent,
    SInputComponent,
    SelectComponent,
    ToggleRowComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="closed.emit()" *transloco="let t">
      <mns-modal
        [title]="screen().name"
        [sub]="t('siteAgents.settings.sub')"
        icon="Cast"
        [widthPx]="620"
        (closed)="closed.emit()"
      >
        <div class="flex flex-col gap-5">
          <mns-sfield
            [label]="t('siteAgents.settings.siteAgentLabel')"
            [hint]="t('siteAgents.settings.siteAgentHint')"
          >
            <mns-select
              [options]="agentOptions()"
              [(value)]="agentId"
              [placeholder]="t('siteAgents.settings.agentPlaceholder')"
            />
          </mns-sfield>

          <div class="grid gap-4 sm:grid-cols-2">
            <mns-sfield
              [label]="t('siteAgents.settings.addressLabel')"
              [hint]="t('siteAgents.settings.addressHint')"
            >
              <mns-sinput [(value)]="localIp" [mono]="true" placeholder="192.168.1.50" />
            </mns-sfield>
            <mns-sfield
              [label]="t('siteAgents.settings.macLabel')"
              [hint]="t('siteAgents.settings.macHint')"
            >
              <mns-sinput [(value)]="macAddress" [mono]="true" placeholder="AA:BB:CC:DD:EE:FF" />
            </mns-sfield>
          </div>

          <mns-sfield
            [label]="t('siteAgents.settings.passphraseLabel')"
            [hint]="
              hasPassphrase()
                ? t('siteAgents.settings.passphraseHintSaved')
                : t('siteAgents.settings.passphraseHintEmpty')
            "
          >
            <mns-sinput
              [(value)]="devmodePassphrase"
              [mono]="true"
              [placeholder]="hasPassphrase() ? '••••••••' : 'AEBC72'"
            />
          </mns-sfield>

          <mns-toggle-row
            [label]="t('siteAgents.settings.autoLaunchLabel')"
            [desc]="t('siteAgents.settings.autoLaunchDesc')"
            [(checked)]="autoLaunchEnabled"
          />

          <mns-toggle-row
            [label]="t('siteAgents.settings.extendDevmodeLabel')"
            [desc]="t('siteAgents.settings.extendDevmodeDesc')"
            [(checked)]="extendDevmodeEnabled"
          />

          @if (extendDevmodeEnabled()) {
            <mns-sfield [label]="t('siteAgents.settings.extendEveryLabel')" [hint]="intervalHint()">
              <mns-sinput
                [(value)]="devmodeExtendIntervalDays"
                type="number"
                [suffix]="t('siteAgents.settings.daysSuffix')"
              />
            </mns-sfield>
          }

          <mns-toggle-row
            [label]="t('siteAgents.settings.wakeBeforeLabel')"
            [desc]="
              macAddress().trim()
                ? t('siteAgents.settings.wakeBeforeDescEnabled')
                : t('siteAgents.settings.wakeNeedsMac')
            "
            [disabled]="!macAddress().trim()"
            [(checked)]="wakeBeforeScheduleEnabled"
          />

          @if (wakeBeforeScheduleEnabled()) {
            <mns-sfield
              [label]="t('siteAgents.settings.wakeLeadLabel')"
              [hint]="t('siteAgents.settings.wakeLeadHint')"
            >
              <mns-sinput
                [(value)]="wakeLeadTimeMinutes"
                type="number"
                [suffix]="t('siteAgents.settings.minutesSuffix')"
              />
            </mns-sfield>
          }

          <mns-toggle-row
            [label]="t('siteAgents.settings.wakeUnreachableLabel')"
            [desc]="
              macAddress().trim()
                ? t('siteAgents.settings.wakeUnreachableDescEnabled')
                : t('siteAgents.settings.wakeNeedsMac')
            "
            [disabled]="!macAddress().trim()"
            [(checked)]="wakeOnUnreachableEnabled"
          />

          <div class="flex justify-end gap-2 pt-2">
            <mns-btn variant="outline" (mnsClick)="closed.emit()">
              {{ t('siteAgents.settings.cancel') }}
            </mns-btn>
            <mns-btn [disabled]="saving()" (mnsClick)="save()">
              {{ saving() ? t('siteAgents.settings.saving') : t('siteAgents.settings.save') }}
            </mns-btn>
          </div>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
  host: { style: 'display:contents' },
})
export class ScreenRemoteSettings implements OnInit {
  private readonly service = inject(SiteAgentService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly screen = input.required<ScreenListItem>();
  readonly remote = input.required<ScreenRemoteControl>();
  readonly closed = output<void>();
  readonly saved = output<ScreenRemoteControl>();

  protected readonly agentOptions = signal<{ value: string; label: string }[]>([]);
  protected readonly saving = signal(false);
  protected readonly hasPassphrase = signal(false);

  protected readonly agentId = signal('');
  protected readonly localIp = signal('');
  protected readonly macAddress = signal('');
  protected readonly devmodePassphrase = signal('');
  protected readonly autoLaunchEnabled = signal(true);
  protected readonly extendDevmodeEnabled = signal(true);
  protected readonly devmodeExtendIntervalDays = signal('7');
  protected readonly wakeBeforeScheduleEnabled = signal(false);
  protected readonly wakeLeadTimeMinutes = signal('10');
  protected readonly wakeOnUnreachableEnabled = signal(false);

  ngOnInit(): void {
    const remote = this.remote();
    this.agentId.set(remote.agentId ?? '');
    this.localIp.set(remote.localIp ?? '');
    this.macAddress.set(remote.macAddress ?? '');
    // The server sends a mask, never the value, so the field starts empty and
    // an empty field on save means "keep what is stored".
    this.hasPassphrase.set(remote.devmodePassphrase === MASKED_SECRET);
    this.devmodePassphrase.set('');
    this.autoLaunchEnabled.set(remote.autoLaunchEnabled);
    this.extendDevmodeEnabled.set(remote.extendDevmodeEnabled);
    this.devmodeExtendIntervalDays.set(String(remote.devmodeExtendIntervalDays));
    this.wakeBeforeScheduleEnabled.set(remote.wakeBeforeScheduleEnabled);
    this.wakeLeadTimeMinutes.set(String(remote.wakeLeadTimeMinutes));
    this.wakeOnUnreachableEnabled.set(remote.wakeOnUnreachableEnabled);

    // No "none" option on purpose. Picking it would save `agentId: null`,
    // which detaches the screen but keeps its address, passphrase and
    // onboarding progress — the half-removal that makes the next agent inherit
    // a previous installation's values. Taking a screen out is the Remove
    // action on its row, which forgets all of it.
    this.service.getAll().subscribe({
      next: (agents: SiteAgentListItem[]) =>
        this.agentOptions.set(agents.map((agent) => ({ value: agent.id, label: agent.name }))),
      error: () =>
        this.toast.error(this.transloco.translate('siteAgents.settings.loadAgentsFailed')),
    });
  }

  /**
   * The session lasts about 1000 hours, and it can only be extended while the
   * TV is on — so a long interval on a set that is off at weekends can lapse,
   * and the TV deletes the app when it does.
   */
  protected intervalHint(): string {
    const days = Number(this.devmodeExtendIntervalDays());
    if (days > DEVMODE_INTERVAL_WARN_DAYS) {
      return this.transloco.translate('siteAgents.settings.intervalHintWarn', {
        min: DEVMODE_INTERVAL_MIN_DAYS,
        max: DEVMODE_INTERVAL_MAX_DAYS,
        warn: DEVMODE_INTERVAL_WARN_DAYS,
      });
    }
    return this.transloco.translate('siteAgents.settings.intervalHintNormal', {
      min: DEVMODE_INTERVAL_MIN_DAYS,
      max: DEVMODE_INTERVAL_MAX_DAYS,
    });
  }

  protected save(): void {
    const payload: UpdateScreenRemoteControlRequest = {
      // Never null: the form has no way to clear it, and a null here would
      // be the half-removal the Remove action exists to avoid.
      ...(this.agentId() ? { agentId: this.agentId() } : {}),
      localIp: this.localIp().trim() || null,
      macAddress: this.macAddress().trim() || null,
      autoLaunchEnabled: this.autoLaunchEnabled(),
      extendDevmodeEnabled: this.extendDevmodeEnabled(),
      devmodeExtendIntervalDays: Number(this.devmodeExtendIntervalDays()),
      wakeBeforeScheduleEnabled: this.wakeBeforeScheduleEnabled(),
      wakeLeadTimeMinutes: Number(this.wakeLeadTimeMinutes()),
      wakeOnUnreachableEnabled: this.wakeOnUnreachableEnabled(),
    };

    // Only send the passphrase when one was typed: blank means keep, and the
    // client has nothing truthful to send otherwise.
    if (this.devmodePassphrase()) {
      payload.devmodePassphrase = this.devmodePassphrase();
    }

    this.saving.set(true);
    this.service.updateRemoteControl(this.screen().id, payload).subscribe({
      next: (remote) => {
        this.saving.set(false);
        this.toast.success(this.transloco.translate('siteAgents.settings.saved'));
        this.saved.emit(remote);
      },
      error: (error: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.toast.error(
          error.error?.message ?? this.transloco.translate('siteAgents.settings.saveFailed'),
        );
      },
    });
  }
}
