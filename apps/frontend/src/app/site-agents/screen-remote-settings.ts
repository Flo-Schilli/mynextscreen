import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
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
  ],
  template: `
    <mns-overlay (closed)="closed.emit()">
      <mns-modal
        [title]="screen().name"
        sub="Remote control"
        icon="Cast"
        [widthPx]="620"
        (closed)="closed.emit()"
      >
        <div class="flex flex-col gap-5">
          <mns-sfield
            label="Site agent"
            hint="Which venue agent looks after this display. To take it out, use Remove on its row."
          >
            <mns-select
              [options]="agentOptions()"
              [(value)]="agentId"
              placeholder="Pick an agent"
            />
          </mns-sfield>

          <div class="grid gap-4 sm:grid-cols-2">
            <mns-sfield label="Address on the venue network" hint="e.g. 192.168.1.50">
              <mns-sinput [(value)]="localIp" [mono]="true" placeholder="192.168.1.50" />
            </mns-sfield>
            <mns-sfield label="MAC address" hint="Needed for Wake-on-LAN. Wired and Wi-Fi differ.">
              <mns-sinput [(value)]="macAddress" [mono]="true" placeholder="AA:BB:CC:DD:EE:FF" />
            </mns-sfield>
          </div>

          <mns-sfield
            label="Developer mode passphrase"
            [hint]="
              hasPassphrase()
                ? 'Saved — leave blank to keep it'
                : 'The six characters shown in the Developer Mode app'
            "
          >
            <mns-sinput
              [(value)]="devmodePassphrase"
              [mono]="true"
              [placeholder]="hasPassphrase() ? '••••••••' : 'AEBC72'"
            />
          </mns-sfield>

          <mns-toggle-row
            label="Start the app automatically"
            desc="When the TV is on but the player is not reporting"
            [(checked)]="autoLaunchEnabled"
          />

          <mns-toggle-row
            label="Keep developer mode alive"
            desc="Extends the session while the TV is on, so the app is not deleted"
            [(checked)]="extendDevmodeEnabled"
          />

          @if (extendDevmodeEnabled()) {
            <mns-sfield label="Extend every" [hint]="intervalHint()">
              <mns-sinput [(value)]="devmodeExtendIntervalDays" type="number" suffix="days" />
            </mns-sfield>
          }

          <mns-toggle-row
            label="Wake before a schedule starts"
            [desc]="
              macAddress().trim()
                ? 'Sends a magic packet shortly before playback is due'
                : 'Needs a MAC address'
            "
            [disabled]="!macAddress().trim()"
            [(checked)]="wakeBeforeScheduleEnabled"
          />

          @if (wakeBeforeScheduleEnabled()) {
            <mns-sfield label="Wake this long before" hint="A set needs about 15 seconds to answer">
              <mns-sinput [(value)]="wakeLeadTimeMinutes" type="number" suffix="minutes" />
            </mns-sfield>
          }

          <mns-toggle-row
            label="Wake whenever the TV does not answer"
            [desc]="
              macAddress().trim()
                ? 'For venues that keep the displays on around the clock'
                : 'Needs a MAC address'
            "
            [disabled]="!macAddress().trim()"
            [(checked)]="wakeOnUnreachableEnabled"
          />

          <div class="flex justify-end gap-2 pt-2">
            <mns-btn variant="outline" (mnsClick)="closed.emit()">Cancel</mns-btn>
            <mns-btn [disabled]="saving()" (mnsClick)="save()">
              {{ saving() ? 'Saving…' : 'Save' }}
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
      error: () => this.toast.error('Could not load the site agents'),
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
      return `${DEVMODE_INTERVAL_MIN_DAYS}–${DEVMODE_INTERVAL_MAX_DAYS} days. Above ${DEVMODE_INTERVAL_WARN_DAYS} only suits a display that runs continuously.`;
    }
    return `${DEVMODE_INTERVAL_MIN_DAYS}–${DEVMODE_INTERVAL_MAX_DAYS} days. Seven is a good default.`;
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
        this.toast.success('Saved');
        this.saved.emit(remote);
      },
      error: (error: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.toast.error(error.error?.message ?? 'Could not save');
      },
    });
  }
}
