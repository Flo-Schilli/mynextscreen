import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/**
 * One-time API-key reveal modal. Owns its transient "Copied!" feedback state;
 * the parent controls visibility and supplies the key. The key is shown once on
 * registration / regeneration and is never persisted client-side.
 *
 * NOTE: Class names (.modal-overlay, .modal, .api-key-value, .btn-copy) are
 * load-bearing for specs — keep them when re-skinning.
 */
@Component({
  selector: 'app-screen-api-key-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="API Key"
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
        <!-- Icon header -->
        <div class="modal-header">
          <span class="modal-icon-tile">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <h2 class="modal-title">Screen API Key</h2>
        </div>

        <!-- Warning banner -->
        <div class="api-key-warning">
          This API key will only be shown once. Copy it now and store it securely.
        </div>

        <!-- Key display -->
        <div class="api-key-display">
          <code class="api-key-value">{{ apiKey() }}</code>
          <button class="btn-copy" type="button" (click)="copy()">
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-done" type="button" (click)="dismiss.emit()">Done</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    /* Backdrop */
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(4, 6, 11, 0.55);
      backdrop-filter: blur(6px);
      animation: fadeIn 0.2s ease both;
    }
    @media (prefers-reduced-motion: reduce) {
      .modal-overlay {
        animation: none;
      }
    }

    /* Panel */
    .modal {
      width: 100%;
      max-width: 520px;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--r-xl, 16px);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
      animation: fadeUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both;
    }
    @media (prefers-reduced-motion: reduce) {
      .modal {
        animation: none;
      }
    }

    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }
    .modal-icon-tile {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: var(--accent-soft);
      color: var(--accent);
      flex-shrink: 0;
    }
    .modal-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
    }

    /* Body area */
    .api-key-warning {
      margin: 20px 24px 16px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--warn-dim, #f59e0b40);
      background: var(--warn-dim, #f59e0b18);
      font-size: 13px;
      color: var(--color-warn, #f59e0b);
      line-height: 1.5;
    }
    .api-key-display {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 24px 20px;
      padding: 11px 13px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
    }
    .api-key-value {
      flex: 1;
      font-size: 12px;
      font-family: var(--font-mono, monospace);
      word-break: break-all;
      color: var(--accent);
    }
    .btn-copy {
      flex-shrink: 0;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--border-strong);
      background: var(--accent-soft);
      color: var(--accent);
      cursor: pointer;
      transition: filter 150ms;
    }
    .btn-copy:hover {
      filter: brightness(1.06);
    }

    /* Footer */
    .modal-footer {
      padding: 0 24px 20px;
    }
    .btn-done {
      width: 100%;
      padding: 11px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
      cursor: pointer;
      transition: filter 150ms;
    }
    .btn-done:hover {
      filter: brightness(1.06);
    }
  `,
})
export class ScreenApiKeyModal {
  readonly apiKey = input.required<string>();
  readonly dismiss = output<void>();

  protected readonly copied = signal(false);

  copy(): void {
    navigator.clipboard.writeText(this.apiKey()).then(() => {
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    });
  }
}
