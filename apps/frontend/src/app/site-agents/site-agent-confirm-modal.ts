import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BtnComponent, ModalComponent, OverlayComponent } from '../ui';
import type { IconName } from '../ui';

/**
 * Confirmation for the destructive actions on the agent page.
 *
 * One parametrised modal rather than three near-identical ones: removing a
 * display, deleting an agent and revoking its access differ only in what has to
 * be said about the consequence, and that is projected content. The parent owns
 * the HTTP work and feeds `busy` and `error` back, as the other delete modals
 * in this app do.
 */
@Component({
  selector: 'app-site-agent-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, TranslocoDirective],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="title()" [icon]="icon()" [widthPx]="460" (closed)="dismiss.emit()">
        <div class="text-sm leading-relaxed text-muted"><ng-content /></div>

        @if (error()) {
          <p class="text-offline text-sm mt-3">{{ error() }}</p>
        }

        <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">
            {{ t('siteAgents.confirm.cancel') }}
          </mns-btn>
          <mns-btn
            variant="danger"
            [icon]="icon()"
            [disabled]="busy()"
            (mnsClick)="confirmed.emit()"
          >
            {{ busy() ? resolvedBusyLabel() : confirmLabel() }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class SiteAgentConfirmModal {
  private readonly transloco = inject(TranslocoService);

  readonly title = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly busyLabel = input<string>('');
  readonly icon = input<IconName>('Trash');
  readonly busy = input<boolean>(false);
  readonly error = input<string>('');

  readonly confirmed = output<void>();
  readonly dismiss = output<void>();

  protected resolvedBusyLabel(): string {
    return this.busyLabel() || this.transloco.translate('siteAgents.confirm.working');
  }
}
