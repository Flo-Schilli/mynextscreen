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
