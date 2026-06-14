import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateScreenRequest } from './screen.model';

/**
 * Register-screen form (pairing modal flow). Owns its own field state (name,
 * location, resolution with a custom-resolution escape hatch) and validates
 * required fields locally, emitting a resolved {@link CreateScreenRequest} only
 * when valid. The parent performs the HTTP request and feeds `creating`/`error` back in.
 *
 * NOTE: IDs (#createName, #createLocation, #createResolution, #createCustomRes)
 * and class names (.error) are load-bearing for specs — keep them when re-skinning.
 */
@Component({
  selector: 'app-screen-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <!-- Pairing modal panel -->
    <div class="pairing-overlay" role="dialog" aria-modal="true" aria-label="Add a screen">
      <div
        class="pairing-panel"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="panel-header">
          <span class="panel-icon">
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
              <path
                d="M3 16.5a4.5 4.5 0 0 1 4.5 4.5M3 12a9 9 0 0 1 9 9M3 7.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5"
              />
              <circle cx="3.5" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div>
            <div class="panel-title">Add a screen</div>
            <div class="panel-sub">Pair a display with a one-time code</div>
          </div>
        </div>

        <!-- Hint banner -->
        <div class="hint-banner">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="hint-icon"
            aria-hidden="true"
          >
            <path
              d="M3 16.5a4.5 4.5 0 0 1 4.5 4.5M3 12a9 9 0 0 1 9 9M3 7.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5"
            />
            <circle cx="3.5" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
          <p class="hint-text">
            Open <strong>screen.mynextscreen.app</strong> on your display — it shows a 6-digit code.
          </p>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="panel-form">
          <div class="form-row">
            <!-- Name -->
            <div class="form-group">
              <label class="field-label" for="createName">Screen name</label>
              <input
                id="createName"
                type="text"
                [(ngModel)]="name"
                name="createName"
                required
                placeholder="e.g. Lobby — Main Wall"
                class="field-input"
              />
            </div>

            <!-- Location -->
            <div class="form-group">
              <label class="field-label" for="createLocation">Location</label>
              <input
                id="createLocation"
                type="text"
                [(ngModel)]="location"
                name="createLocation"
                required
                placeholder="HQ · Ground Floor"
                class="field-input"
              />
            </div>
          </div>

          <!-- Resolution -->
          <div class="form-group">
            <label class="field-label" for="createResolution">Display resolution</label>
            <select
              id="createResolution"
              [(ngModel)]="resolution"
              name="createResolution"
              required
              class="field-input field-select"
            >
              <option value="1920x1080">1920 × 1080 · Full HD</option>
              <option value="3840x2160">3840 × 2160 · 4K UHD</option>
              <option value="1280x720">1280 × 720 · HD</option>
              <option value="2560x1440">2560 × 1440 · QHD</option>
              <option value="1080x1920">1080 × 1920 · Full HD Portrait</option>
              <option value="custom">Custom resolution…</option>
            </select>
          </div>

          @if (resolution === 'custom') {
            <div class="form-group">
              <label class="field-label" for="createCustomRes">Custom resolution</label>
              <input
                id="createCustomRes"
                type="text"
                [(ngModel)]="customResolution"
                name="createCustomResolution"
                required
                placeholder="e.g. 1920x1200"
                class="field-input mono"
              />
            </div>
          }

          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }

          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn-submit" [disabled]="creating()">
              {{ creating() ? 'Registering…' : 'Register Screen' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    /* Overlay */
    .pairing-overlay {
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
      .pairing-overlay {
        animation: none;
      }
    }

    /* Panel */
    .pairing-panel {
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
      .pairing-panel {
        animation: none;
      }
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }
    .panel-icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 11px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
      flex-shrink: 0;
    }
    .panel-title {
      font-size: 17px;
      font-weight: 700;
    }
    .panel-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    /* Hint banner */
    .hint-banner {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin: 20px 24px 0;
      padding: 14px;
      border-radius: 14px;
      background: var(--accent-soft);
      border: 1px solid var(--border);
    }
    .hint-icon {
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 1px;
    }
    .hint-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.45;
      margin: 0;
    }
    .hint-text strong {
      color: var(--text);
    }

    /* Form */
    .panel-form {
      padding: 20px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .field-input {
      width: 100%;
      padding: 11px 13px;
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      color: var(--text);
      outline: none;
      transition:
        border-color 150ms,
        box-shadow 150ms;
    }
    .field-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .field-select {
      appearance: none;
      cursor: pointer;
    }
    .mono {
      font-family: var(--font-mono, monospace);
    }

    /* Error */
    .error {
      font-size: 13px;
      color: var(--color-offline, #ef4444);
    }

    /* Actions */
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }
    .btn-cancel,
    .btn-submit {
      flex: 1;
      padding: 11px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition:
        filter 150ms,
        opacity 150ms;
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border-strong);
      color: var(--text);
    }
    .btn-cancel:hover {
      filter: brightness(1.06);
    }
    .btn-submit {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      border: none;
      color: #fff;
    }
    .btn-submit:hover:not(:disabled) {
      filter: brightness(1.06);
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (prefers-reduced-motion: reduce) {
      .field-input,
      .btn-cancel,
      .btn-submit {
        transition: none;
      }
    }
  `,
})
export class ScreenCreateForm {
  readonly creating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly create = output<CreateScreenRequest>();
  readonly dismiss = output<void>();

  protected name = '';
  protected location = '';
  protected resolution = '1920x1080';
  protected customResolution = '';
  protected readonly localError = signal('');

  onSubmit(): void {
    const resolution = this.resolution === 'custom' ? this.customResolution : this.resolution;

    if (!this.name || !this.location || !resolution) {
      this.localError.set('All fields are required.');
      return;
    }

    this.localError.set('');
    this.create.emit({ name: this.name, location: this.location, resolution });
  }
}
