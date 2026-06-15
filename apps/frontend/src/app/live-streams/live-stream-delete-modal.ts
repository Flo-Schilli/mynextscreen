import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BtnComponent, OverlayComponent, ModalComponent } from '../ui';
import { LiveStream } from './live-stream.model';

/**
 * Delete-confirmation modal for a live stream, reskinned onto the shared
 * `mns-overlay`/`mns-modal` primitives. Kept as a safety confirm. The parent
 * performs the HTTP request and feeds `deleting`/`error` back in.
 */
@Component({
  selector: 'app-live-stream-delete-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Delete live stream" icon="Trash" [widthPx]="420" (closed)="dismiss.emit()">
        <div class="flex flex-col gap-4">
          <p class="text-sm text-muted leading-relaxed">
            Are you sure you want to delete <strong class="text-text">{{ stream().name }}</strong
            >? This action cannot be undone.
          </p>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </div>

        <div slot="footer" class="flex gap-2.5 px-6 pb-5">
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn
            variant="danger"
            [full]="true"
            [disabled]="deleting()"
            (mnsClick)="confirm.emit()"
          >
            {{ deleting() ? 'Deleting…' : 'Delete' }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
  styles: `
    .error {
      font-size: 0.8125rem;
      color: var(--offline);
      padding: 0.625rem 0.875rem;
      border-radius: var(--r-md, 8px);
      border: 1px solid color-mix(in srgb, var(--offline) 30%, var(--border));
      background: var(--offline-dim);
      margin: 0;
    }
  `,
})
export class LiveStreamDeleteModal {
  readonly stream = input.required<LiveStream>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
