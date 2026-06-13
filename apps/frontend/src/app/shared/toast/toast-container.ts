import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Renders the global toast queue as a fixed stack in the top-right corner,
 * above all app chrome. Presentational only — the queue lives in
 * {@link ToastService}. Mounted once at the app root.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" role="status">
          <span class="toast-icon" aria-hidden="true">
            @switch (toast.type) {
              @case ('success') {
                ✓
              }
              @case ('error') {
                ✕
              }
              @default {
                ℹ
              }
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            aria-label="Dismiss notification"
            (click)="toasts.dismiss(toast.id)"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      max-width: min(24rem, calc(100vw - 2rem));
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.75rem 0.875rem;
      border-radius: 0.5rem;
      border: 1px solid;
      font-size: 0.8125rem;
      line-height: 1.4;
      box-shadow:
        0 4px 12px var(--color-shadow),
        0 2px 4px var(--color-shadow);
      animation: toast-in 0.18s ease-out;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(0.75rem);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }

    .toast-success {
      background: #065f46;
      border-color: #047857;
      color: #d1fae5;
    }
    .toast-error {
      background: #991b1b;
      border-color: #b91c1c;
      color: #fecaca;
    }
    .toast-info {
      background: var(--color-bg-tertiary);
      border-color: var(--color-border);
      color: var(--color-text-primary);
    }

    .toast-icon {
      flex-shrink: 0;
      font-weight: 700;
      line-height: 1.4;
    }

    .toast-message {
      flex: 1;
      word-break: break-word;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: inherit;
      opacity: 0.7;
      cursor: pointer;
      padding: 0;
      font-size: 0.75rem;
      line-height: 1.4;
    }
    .toast-close:hover {
      opacity: 1;
    }
  `,
})
export class ToastContainer {
  readonly toasts = inject(ToastService);
}
