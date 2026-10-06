import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  BtnComponent,
  OverlayComponent,
  ModalComponent,
  SInputComponent,
  SFieldComponent,
  ToggleRowComponent,
} from '../ui';
import {
  CreateLiveStreamRequest,
  LiveStreamProtocol,
  TranscodingPreset,
  TRANSCODING_PRESETS,
} from './live-stream.model';

const PROTOCOLS: readonly LiveStreamProtocol[] = ['rtmp', 'rtp'];

/**
 * Create-live-stream modal, reskinned onto the shared `mns-overlay`/`mns-modal`
 * primitives. Owns its own field state (name, source URL, protocol, quality
 * preset, audio) as signals and validates required fields locally, emitting a
 * resolved {@link CreateLiveStreamRequest} only when valid. The parent performs
 * the HTTP request and feeds `creating`/`error` back in.
 *
 * Protocol is a 2-value segmented control (RTMP/RTP) and the quality preset is
 * the five real {@link TranscodingPreset}s — no fabricated 4-protocol /
 * source-1080p-720p-480p sets from the mock.
 */
@Component({
  selector: 'app-live-stream-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    SInputComponent,
    SFieldComponent,
    ToggleRowComponent,
    BtnComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="t('liveStreams.create.title')"
        icon="Stream"
        [widthPx]="480"
        (closed)="dismiss.emit()"
      >
        <div class="flex flex-col gap-5">
          <mns-sfield [label]="t('liveStreams.create.nameLabel')">
            <mns-sinput [(value)]="name" [placeholder]="t('liveStreams.create.namePlaceholder')" />
          </mns-sfield>

          <div>
            <span class="seg-label">{{ t('liveStreams.create.protocolLabel') }}</span>
            <div class="seg-row">
              @for (p of protocols; track p) {
                <button
                  type="button"
                  class="seg"
                  [class.active]="protocol() === p"
                  (click)="protocol.set(p)"
                >
                  {{ p.toUpperCase() }}
                </button>
              }
            </div>
          </div>

          <mns-sfield [label]="t('liveStreams.create.sourceUrlLabel')">
            <mns-sinput [(value)]="sourceUrl" [mono]="true" [placeholder]="sourceHint()" />
          </mns-sfield>

          <div>
            <span class="seg-label">{{ t('liveStreams.create.qualityLabel') }}</span>
            <div class="seg-grid">
              @for (preset of presets; track preset) {
                <button
                  type="button"
                  class="seg"
                  [class.active]="quality() === preset"
                  (click)="quality.set(preset)"
                >
                  {{ t('liveStreams.preset.' + preset) }}
                </button>
              }
            </div>
          </div>

          <mns-toggle-row
            icon="Wifi"
            [label]="t('liveStreams.create.enableAudioLabel')"
            [desc]="t('liveStreams.create.enableAudioDesc')"
            [(checked)]="audioEnabled"
          />

          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }
        </div>

        <div slot="footer" class="flex gap-2.5 px-6 pb-5">
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">
            {{ t('common.actions.cancel') }}
          </mns-btn>
          <mns-btn
            variant="primary"
            icon="Stream"
            [full]="true"
            [disabled]="creating()"
            (mnsClick)="onSubmit()"
          >
            {{
              creating() ? t('liveStreams.create.creating') : t('liveStreams.create.createStream')
            }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
  styles: `
    .seg-label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .seg-row {
      display: flex;
      gap: 8px;
    }
    .seg-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    @media (min-width: 640px) {
      .seg-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .seg {
      flex: 1;
      padding: 9px 6px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      color: var(--text-muted);
      transition:
        border-color 150ms,
        color 150ms,
        background 150ms;
    }
    .seg.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .error {
      font-size: 0.8125rem;
      color: var(--color-offline);
      padding: 0.625rem 0.875rem;
      border-radius: var(--r-md, 8px);
      border: 1px solid color-mix(in srgb, var(--color-offline) 30%, var(--border));
      background: var(--offline-dim);
      margin: 0;
    }
  `,
})
export class LiveStreamCreateModal {
  readonly creating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly create = output<CreateLiveStreamRequest>();
  readonly dismiss = output<void>();

  private readonly transloco = inject(TranslocoService);

  protected readonly protocols = PROTOCOLS;
  protected readonly presets = TRANSCODING_PRESETS;

  protected readonly name = signal('');
  protected readonly sourceUrl = signal('');
  protected readonly protocol = signal<LiveStreamProtocol>('rtmp');
  protected readonly quality = signal<TranscodingPreset>('high_1080p');
  protected readonly audioEnabled = signal(true);
  protected readonly localError = signal('');

  protected sourceHint(): string {
    return this.protocol() === 'rtmp'
      ? this.transloco.translate('liveStreams.create.sourceHintRtmp')
      : this.transloco.translate('liveStreams.create.sourceHintRtp');
  }

  onSubmit(): void {
    if (!this.name().trim()) {
      this.localError.set(this.transloco.translate('liveStreams.create.errorNameRequired'));
      return;
    }
    if (!this.sourceUrl().trim()) {
      this.localError.set(this.transloco.translate('liveStreams.create.errorSourceRequired'));
      return;
    }

    this.localError.set('');
    this.create.emit({
      name: this.name().trim(),
      sourceUrl: this.sourceUrl().trim(),
      protocol: this.protocol(),
      transcodingPreset: this.quality(),
      audioEnabled: this.audioEnabled(),
    });
  }
}
