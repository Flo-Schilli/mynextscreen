import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  BtnComponent,
  OverlayComponent,
  ModalComponent,
  SInputComponent,
  SFieldComponent,
  SelectComponent,
  ToggleRowComponent,
} from '../ui';
import type { SelectOption } from '../ui';
import { PtzSettingsFields } from './ptz-settings-fields';
import { SiteAgentListItem } from '../site-agents/site-agent.model';
import {
  CreateLiveStreamRequest,
  EncoderPref,
  ENCODER_PREFS,
  isValidIpAddress,
  LiveStreamProtocol,
  LiveStreamSourceType,
  parsePtzPort,
  PtzProtocol,
  QualityPreset,
  QUALITY_PRESETS,
  TranscodingPreset,
  TRANSCODING_PRESETS,
} from './live-stream.model';

const PROTOCOLS: readonly LiveStreamProtocol[] = ['rtmp', 'rtp'];
const SOURCE_TYPES: readonly LiveStreamSourceType[] = ['pull', 'ndi'];
const NDI_HOME_URL = 'https://ndi.video';

/**
 * Create-live-stream modal, reskinned onto the shared `mns-overlay`/`mns-modal`
 * primitives. Owns its own field state (name, source URL, protocol, quality
 * preset, audio) as signals and validates required fields locally, emitting a
 * resolved {@link CreateLiveStreamRequest} only when valid. The parent performs
 * the HTTP request and feeds `creating`/`error` back in.
 *
 * A source-type segment switches between a pull stream (protocol, URL,
 * transcoding preset, audio) and an NDI camera ingested by a site agent
 * (agent, camera address, optional NDI source, quality preset, encoder);
 * validation follows the selected type.
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
    SelectComponent,
    ToggleRowComponent,
    BtnComponent,
    PtzSettingsFields,
    RouterLink,
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
            <span class="seg-label">{{ t('liveStreams.create.sourceTypeLabel') }}</span>
            <div class="seg-row">
              @for (type of sourceTypes; track type) {
                <button
                  type="button"
                  class="seg"
                  [class.active]="sourceType() === type"
                  (click)="sourceType.set(type)"
                >
                  {{ t('liveStreams.sourceType.' + type) }}
                </button>
              }
            </div>
          </div>

          @if (sourceType() === 'pull') {
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
          } @else {
            <mns-sfield [label]="t('liveStreams.create.agentLabel')">
              <mns-select
                [options]="agentOptions()"
                [(value)]="agentId"
                [placeholder]="t('liveStreams.create.agentPlaceholder')"
              />
            </mns-sfield>

            @if (!anyAgentReady()) {
              <p class="hint" data-testid="no-ready-agent">
                {{ t('liveStreams.create.noReadyAgent') }}
                <a routerLink="/site-agents" (click)="dismiss.emit()">{{
                  t('liveStreams.create.noReadyAgentLink')
                }}</a>
              </p>
            }

            <mns-sfield [label]="t('liveStreams.create.cameraHostLabel')">
              <mns-sinput
                [(value)]="cameraHost"
                [mono]="true"
                [placeholder]="t('liveStreams.create.cameraHostPlaceholder')"
              />
            </mns-sfield>

            <mns-sfield
              [label]="t('liveStreams.create.ndiSourceLabel')"
              [hint]="t('liveStreams.create.ndiSourceHint')"
            >
              <mns-sinput
                [(value)]="ndiSourceName"
                [placeholder]="t('liveStreams.create.ndiSourcePlaceholder')"
              />
            </mns-sfield>

            <div>
              <span class="seg-label">{{ t('liveStreams.create.qualityLabel') }}</span>
              <div class="seg-row">
                @for (preset of qualityPresets; track preset) {
                  <button
                    type="button"
                    class="seg"
                    [class.active]="qualityPreset() === preset"
                    (click)="qualityPreset.set(preset)"
                  >
                    {{ t('liveStreams.qualityPreset.' + preset) }}
                  </button>
                }
              </div>
            </div>

            <div>
              <span class="seg-label">{{ t('liveStreams.create.encoderLabel') }}</span>
              <div class="seg-row">
                @for (enc of encoderPrefs; track enc) {
                  <button
                    type="button"
                    class="seg"
                    [class.active]="encoderPref() === enc"
                    (click)="encoderPref.set(enc)"
                  >
                    {{ t('liveStreams.encoder.' + enc) }}
                  </button>
                }
              </div>
            </div>

            <app-ptz-settings-fields
              [(enabled)]="ptzEnabled"
              [(protocol)]="ptzProtocol"
              [(port)]="ptzPort"
            />

            <p class="trademark">
              {{ t('liveStreams.create.ndiTrademark') }}
              <a [href]="ndiHomeUrl" target="_blank" rel="noopener noreferrer">ndi.video</a>
            </p>
          }

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
    .hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
    .hint a {
      text-decoration: underline;
      color: var(--accent);
    }
    .trademark {
      margin: 0;
      font-size: 0.6875rem;
      color: var(--text-muted);
    }
    .trademark a {
      text-decoration: underline;
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
  readonly agents = input<readonly SiteAgentListItem[]>([]);

  readonly create = output<CreateLiveStreamRequest>();
  readonly dismiss = output<void>();

  private readonly transloco = inject(TranslocoService);

  protected readonly protocols = PROTOCOLS;
  protected readonly presets = TRANSCODING_PRESETS;
  protected readonly sourceTypes = SOURCE_TYPES;
  protected readonly qualityPresets = QUALITY_PRESETS;
  protected readonly encoderPrefs = ENCODER_PREFS;
  protected readonly ndiHomeUrl = NDI_HOME_URL;

  protected readonly sourceType = signal<LiveStreamSourceType>('pull');
  protected readonly name = signal('');
  protected readonly sourceUrl = signal('');
  protected readonly protocol = signal<LiveStreamProtocol>('rtmp');
  protected readonly quality = signal<TranscodingPreset>('high_1080p');
  protected readonly audioEnabled = signal(true);
  protected readonly agentId = signal('');
  protected readonly cameraHost = signal('');
  protected readonly ndiSourceName = signal('');
  protected readonly qualityPreset = signal<QualityPreset>('720p30');
  protected readonly encoderPref = signal<EncoderPref>('auto');
  protected readonly ptzEnabled = signal(false);
  protected readonly ptzProtocol = signal<PtzProtocol>('visca_udp');
  protected readonly ptzPort = signal('');
  protected readonly localError = signal('');

  protected readonly anyAgentReady = computed(() =>
    this.agents().some((a) => a.capturePluginState === 'ready'),
  );

  /** Agents without a ready capture plugin stay listed, disabled, with the reason. */
  protected readonly agentOptions = computed<SelectOption[]>(() =>
    this.agents().map((a) =>
      a.capturePluginState === 'ready'
        ? { value: a.id, label: a.name }
        : {
            value: a.id,
            label: `${a.name} (${this.transloco.translate('liveStreams.create.agentNotReady')})`,
            disabled: true,
          },
    ),
  );

  protected sourceHint(): string {
    return this.protocol() === 'rtmp'
      ? this.transloco.translate('liveStreams.create.sourceHintRtmp')
      : this.transloco.translate('liveStreams.create.sourceHintRtp');
  }

  onSubmit(): void {
    const name = this.name().trim();
    if (!name) {
      this.fail('liveStreams.create.errorNameRequired');
      return;
    }
    const request = this.sourceType() === 'ndi' ? this.buildNdi(name) : this.buildPull(name);
    if (request) {
      this.localError.set('');
      this.create.emit(request);
    }
  }

  private buildPull(name: string): CreateLiveStreamRequest | null {
    const sourceUrl = this.sourceUrl().trim();
    if (!sourceUrl) {
      this.fail('liveStreams.create.errorSourceRequired');
      return null;
    }
    return {
      name,
      sourceUrl,
      protocol: this.protocol(),
      transcodingPreset: this.quality(),
      audioEnabled: this.audioEnabled(),
    };
  }

  private buildNdi(name: string): CreateLiveStreamRequest | null {
    if (!this.agentId()) {
      this.fail('liveStreams.create.errorAgentRequired');
      return null;
    }
    const agent = this.agents().find((a) => a.id === this.agentId());
    if (agent && agent.capturePluginState !== 'ready') {
      this.fail('liveStreams.create.errorAgentNotReady');
      return null;
    }
    const cameraHost = this.cameraHost().trim();
    if (!cameraHost) {
      this.fail('liveStreams.create.errorCameraHostRequired');
      return null;
    }
    if (!isValidIpAddress(cameraHost)) {
      this.fail('liveStreams.create.errorCameraHostInvalid');
      return null;
    }
    const ptz = this.buildPtz();
    if (!ptz) return null;
    const ndiSourceName = this.ndiSourceName().trim();
    return {
      name,
      sourceType: 'ndi',
      agentId: this.agentId(),
      cameraHost,
      ...(ndiSourceName ? { ndiSourceName } : {}),
      qualityPreset: this.qualityPreset(),
      encoderPref: this.encoderPref(),
      ...ptz,
    };
  }

  /** PTZ fields for the request; `null` when enabled with an invalid port. */
  private buildPtz(): Pick<
    CreateLiveStreamRequest,
    'ptzEnabled' | 'ptzProtocol' | 'ptzPort'
  > | null {
    if (!this.ptzEnabled()) return {};
    const port = parsePtzPort(this.ptzPort());
    if (!port.valid) {
      this.fail('liveStreams.ptz.errorPortInvalid');
      return null;
    }
    return { ptzEnabled: true, ptzProtocol: this.ptzProtocol(), ptzPort: port.value };
  }

  private fail(key: string): void {
    this.localError.set(this.transloco.translate(key));
  }
}
