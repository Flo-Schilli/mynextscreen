import { Component, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LiveStream,
  LiveStreamProtocol,
  TranscodingPreset,
  UpdateLiveStreamRequest,
  TRANSCODING_PRESET_LABELS,
  TRANSCODING_PRESETS,
} from './live-stream.model';

/**
 * Edit-live-stream modal. Seeds its field state once from the `stream` input on
 * open (the parent recreates the component per selection via `@if`), validates
 * required fields locally, and emits an {@link UpdateLiveStreamRequest} when
 * valid. The parent performs the HTTP request and feeds `saving`/`error` back in.
 */
@Component({
  selector: 'app-live-stream-edit-modal',
  standalone: true,
  imports: [FormsModule],
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
        max-width: 480px;
        background: var(--surface);
        border: 1px solid var(--border-strong);
        border-radius: var(--r-xl, 16px);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
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
      form {
        padding: 1.25rem 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-muted);
      }
      input[type='text'],
      select {
        padding: 0.625rem 0.875rem;
        background: var(--surface-2);
        border: 1px solid var(--border-strong);
        border-radius: var(--r-md, 8px);
        color: var(--text);
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
      }
      input[type='text']:focus,
      select:focus {
        border-color: var(--accent);
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text);
        cursor: pointer;
      }
      .checkbox-label input[type='checkbox'] {
        accent-color: var(--accent);
        width: 1rem;
        height: 1rem;
      }
      .error {
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
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
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
      .btn-primary {
        background: var(--accent);
        color: #fff;
      }
      .btn-primary:hover:not(:disabled) {
        opacity: 0.88;
      }
      .btn-secondary {
        background: var(--surface-2);
        color: var(--text);
        border: 1px solid var(--border-strong);
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--surface-3);
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
      aria-label="Edit Live Stream"
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
        <h2>Edit Live Stream</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="editName">Name</label>
            <input id="editName" type="text" [(ngModel)]="name" name="editName" required />
          </div>
          <div class="form-group">
            <label for="editSourceUrl">Source URL</label>
            <input
              id="editSourceUrl"
              type="text"
              [(ngModel)]="sourceUrl"
              name="editSourceUrl"
              required
            />
          </div>
          <div class="form-group">
            <label for="editProtocol">Protocol</label>
            <select id="editProtocol" [(ngModel)]="protocol" name="editProtocol" required>
              <option value="rtmp">RTMP</option>
              <option value="rtp">RTP</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editPreset">Quality Preset</label>
            <select id="editPreset" [(ngModel)]="preset" name="editPreset">
              @for (p of presets; track p) {
                <option [value]="p">{{ presetLabel(p) }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="audioEnabled" name="editAudioEnabled" />
              Enable audio
            </label>
          </div>
          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LiveStreamEditModal implements OnInit {
  readonly stream = input.required<LiveStream>();
  readonly saving = input.required<boolean>();
  readonly error = input.required<string>();

  readonly save = output<UpdateLiveStreamRequest>();
  readonly dismiss = output<void>();

  protected readonly presets = TRANSCODING_PRESETS;

  protected name = '';
  protected sourceUrl = '';
  protected protocol: LiveStreamProtocol = 'rtmp';
  protected preset: TranscodingPreset = 'high_1080p';
  protected audioEnabled = true;
  protected readonly localError = signal('');

  ngOnInit(): void {
    const stream = this.stream();
    this.name = stream.name;
    this.sourceUrl = stream.sourceUrl;
    this.protocol = stream.protocol;
    this.preset = stream.transcodingPreset;
    this.audioEnabled = stream.audioEnabled;
  }

  protected presetLabel(preset: TranscodingPreset): string {
    return TRANSCODING_PRESET_LABELS[preset] ?? preset;
  }

  onSubmit(): void {
    if (!this.name) {
      this.localError.set('Name is required.');
      return;
    }
    if (!this.sourceUrl) {
      this.localError.set('Source URL is required.');
      return;
    }

    this.localError.set('');
    this.save.emit({
      name: this.name,
      sourceUrl: this.sourceUrl,
      protocol: this.protocol,
      transcodingPreset: this.preset,
      audioEnabled: this.audioEnabled,
    });
  }
}
