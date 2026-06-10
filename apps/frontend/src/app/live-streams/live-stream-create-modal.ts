import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreateLiveStreamRequest,
  LiveStreamProtocol,
  TranscodingPreset,
  TRANSCODING_PRESET_LABELS,
  TRANSCODING_PRESETS,
} from './live-stream.model';

/**
 * Create-live-stream modal. Owns its own field state (name, source URL,
 * protocol, quality preset, audio) and validates required fields locally,
 * emitting a resolved {@link CreateLiveStreamRequest} only when valid. The
 * parent performs the HTTP request and feeds `creating`/`error` back in.
 */
@Component({
  selector: 'app-live-stream-create-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Create Live Stream"
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
        <h2>Create Live Stream</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="createName">Name</label>
            <input
              id="createName"
              type="text"
              [(ngModel)]="name"
              name="createName"
              required
              placeholder="e.g. Lobby Camera"
            />
          </div>
          <div class="form-group">
            <label for="createSourceUrl">Source URL</label>
            <input
              id="createSourceUrl"
              type="text"
              [(ngModel)]="sourceUrl"
              name="createSourceUrl"
              required
              placeholder="rtmp://example.com/live/stream-key"
            />
          </div>
          <div class="form-group">
            <label for="createProtocol">Protocol</label>
            <select id="createProtocol" [(ngModel)]="protocol" name="createProtocol" required>
              <option value="rtmp">RTMP</option>
              <option value="rtp">RTP</option>
            </select>
          </div>
          <div class="form-group">
            <label for="createPreset">Quality Preset</label>
            <select id="createPreset" [(ngModel)]="preset" name="createPreset">
              @for (p of presets; track p) {
                <option [value]="p">{{ presetLabel(p) }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="audioEnabled" name="createAudioEnabled" />
              Enable audio
            </label>
          </div>
          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="creating()">
              {{ creating() ? 'Creating...' : 'Create Stream' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LiveStreamCreateModal {
  readonly creating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly create = output<CreateLiveStreamRequest>();
  readonly dismiss = output<void>();

  protected readonly presets = TRANSCODING_PRESETS;

  protected name = '';
  protected sourceUrl = '';
  protected protocol: LiveStreamProtocol = 'rtmp';
  protected preset: TranscodingPreset = 'high_1080p';
  protected audioEnabled = true;
  protected readonly localError = signal('');

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
    this.create.emit({
      name: this.name,
      sourceUrl: this.sourceUrl,
      protocol: this.protocol,
      transcodingPreset: this.preset,
      audioEnabled: this.audioEnabled,
    });
  }
}
