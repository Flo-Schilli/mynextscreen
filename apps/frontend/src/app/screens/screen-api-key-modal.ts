import { Component, input, output, signal } from '@angular/core';

/**
 * One-time API-key reveal modal. Owns its transient "Copied!" feedback state;
 * the parent controls visibility and supplies the key. The key is shown once on
 * registration / regeneration and is never persisted client-side.
 */
@Component({
  selector: 'app-screen-api-key-modal',
  standalone: true,
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
        <h2>Screen API Key</h2>
        <div class="api-key-warning">
          This API key will only be shown once. Copy it now and store it securely.
        </div>
        <div class="api-key-display">
          <code class="api-key-value">{{ apiKey() }}</code>
          <button class="btn btn-secondary btn-copy" (click)="copy()">
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" (click)="dismiss.emit()">Done</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .api-key-warning {
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: #fbbf24;
      line-height: 1.5;
    }
    .api-key-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    .api-key-value {
      flex: 1;
      font-size: 0.75rem;
      word-break: break-all;
      color: var(--color-accent);
    }
    .btn-copy {
      flex-shrink: 0;
      padding: 0.25rem 0.75rem;
      font-size: 0.8125rem;
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
