import { Component, input, output } from '@angular/core';
import { LiveStream } from './live-stream.model';

/**
 * Delete-confirmation modal for a live stream. The parent performs the HTTP
 * request and feeds `deleting`/`error` back in.
 */
@Component({
  selector: 'app-live-stream-delete-modal',
  standalone: true,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: rgba(4, 6, 11, 0.55);
        backdrop-filter: blur(6px);
        animation: mns-fade-in 0.18s ease both;
      }
      @media (prefers-reduced-motion: reduce) {
        .modal-overlay {
          animation: none;
        }
      }
      .modal {
        width: 100%;
        max-width: 420px;
        background: var(--surface);
        border: 1px solid var(--border-strong);
        border-radius: var(--r-xl, 16px);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: mns-fade-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .modal {
          animation: none;
        }
      }
      h2 {
        margin: 0;
        padding: 1.25rem 1.5rem;
        font-size: 1.0625rem;
        font-weight: 700;
        color: var(--text);
        border-bottom: 1px solid var(--border);
      }
      p {
        margin: 0;
        padding: 1.25rem 1.5rem 0;
        font-size: 0.875rem;
        color: var(--text-muted);
        line-height: 1.5;
      }
      strong {
        color: var(--text);
        font-weight: 700;
      }
      .error {
        margin: 0.75rem 1.5rem 0;
        font-size: 0.8125rem;
        color: var(--offline);
        padding: 0.625rem 0.875rem;
        border-radius: var(--r-md, 8px);
        border: 1px solid color-mix(in srgb, var(--offline) 30%, var(--border));
        background: var(--offline-dim);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.625rem;
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--border);
        margin-top: 1.25rem;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5625rem 1.125rem;
        border-radius: var(--r-lg, 10px);
        border: none;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        transition: opacity 0.15s;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: var(--surface-2);
        color: var(--text);
        border: 1px solid var(--border-strong);
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--surface-3);
      }
      .btn-danger {
        background: var(--offline);
        color: #fff;
      }
      .btn-danger:hover:not(:disabled) {
        opacity: 0.88;
      }
      @keyframes mns-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes mns-fade-up {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm deletion"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Delete Live Stream</h2>
        <p>
          Are you sure you want to delete <strong>{{ stream().name }}</strong
          >? This action cannot be undone.
        </p>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-danger" (click)="confirm.emit()" [disabled]="deleting()">
            {{ deleting() ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LiveStreamDeleteModal {
  readonly stream = input.required<LiveStream>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
