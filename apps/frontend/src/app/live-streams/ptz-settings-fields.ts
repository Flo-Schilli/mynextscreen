import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SFieldComponent, SInputComponent, ToggleRowComponent } from '../ui';
import { PTZ_DEFAULT_PORTS, PTZ_PROTOCOLS, PtzProtocol } from './live-stream.model';

/**
 * Dumb PTZ settings block shared by the create modal and the detail page:
 * enable toggle, VISCA protocol segment and an optional port whose placeholder
 * shows the protocol default. Validation lives in `parsePtzPort`.
 */
@Component({
  selector: 'app-ptz-settings-fields',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SFieldComponent, SInputComponent, ToggleRowComponent, TranslocoDirective],
  template: `
    <div class="flex flex-col gap-4" *transloco="let t">
      <mns-toggle-row
        icon="Cast"
        [label]="t('liveStreams.ptz.enableLabel')"
        [desc]="t('liveStreams.ptz.enableDesc')"
        [(checked)]="enabled"
      />
      @if (enabled()) {
        <div>
          <span class="seg-label">{{ t('liveStreams.ptz.protocolLabel') }}</span>
          <div class="seg-row">
            @for (p of protocols; track p) {
              <button
                type="button"
                class="seg"
                [class.active]="protocol() === p"
                [attr.aria-pressed]="protocol() === p"
                (click)="protocol.set(p)"
              >
                {{ t('liveStreams.ptz.protocol.' + p) }}
              </button>
            }
          </div>
        </div>
        <mns-sfield [label]="t('liveStreams.ptz.portLabel')" [hint]="t('liveStreams.ptz.portHint')">
          <mns-sinput type="number" [mono]="true" [(value)]="port" [placeholder]="defaultPort()" />
        </mns-sfield>
      }
    </div>
  `,
  styles: `
    .seg-label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .seg-row {
      display: flex;
      gap: 8px;
    }
    .seg {
      flex: 1;
      padding: 9px 6px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      color: var(--text-muted);
      transition:
        border-color 150ms,
        color 150ms,
        background 150ms;
    }
    .seg.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
  `,
})
export class PtzSettingsFields {
  readonly enabled = model(false);
  readonly protocol = model<PtzProtocol>('visca_udp');
  /** Raw port text; empty means the protocol default. */
  readonly port = model('');

  protected readonly protocols = PTZ_PROTOCOLS;
  protected readonly defaultPort = computed(() => String(PTZ_DEFAULT_PORTS[this.protocol()]));
}
