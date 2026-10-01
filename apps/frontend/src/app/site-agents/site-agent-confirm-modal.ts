import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  imports: [OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal [title]="title()" [icon]="icon()" [widthPx]="460" (closed)="dismiss.emit()">
        <div class="text-sm leading-relaxed text-muted"><ng-content /></div>

        @if (error()) {
          <p class="text-offline text-sm mt-3">{{ error() }}</p>
        }

        <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn
            variant="danger"
            [icon]="icon()"
            [disabled]="busy()"
            (mnsClick)="confirmed.emit()"
          >
            {{ busy() ? busyLabel() : confirmLabel() }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class SiteAgentConfirmModal {
  readonly title = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly busyLabel = input<string>('Working…');
  readonly icon = input<IconName>('Trash');
  readonly busy = input<boolean>(false);
  readonly error = input<string>('');

  readonly confirmed = output<void>();
  readonly dismiss = output<void>();
}
