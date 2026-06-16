import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../ui';
import {
  LiveStreamStatus,
  TranscodingPreset,
  TRANSCODING_PRESET_LABELS,
} from './live-stream.model';

/** Deterministic decorative gradients keyed off the stream id (Entsch. 8). */
const THUMBS: readonly string[] = [
  'linear-gradient(150deg, #1d4e6b, #0a1c2e)',
  'linear-gradient(150deg, #43215f, #160a26)',
  'linear-gradient(150deg, #14463d, #06201c)',
  'linear-gradient(150deg, #5a3015, #25130a)',
  'linear-gradient(150deg, #2a2356, #110e26)',
];

function hashIndex(id: string, len: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % len;
}

/**
 * Presentational 16:9 cinematic monitor band for a live stream. All chrome
 * (blobs, scanlines, sweep, vignette) is purely decorative — no fabricated
 * telemetry. Only honest overlays are shown: a pulsing LIVE pill while
 * `active`, a NO-SIGNAL state while `idle`/`error`, a MUTED badge when audio is
 * off, and a "Preset" target label (never presented as a live measurement).
 *
 * The gradient is derived deterministically from the stream id so each card
 * keeps a stable colour. All animations are disabled under
 * `prefers-reduced-motion`.
 */
@Component({
  selector: 'app-live-stream-monitor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="monitor" [class.big]="big()" [style.background]="gradient()">
      @if (!offline()) {
        <div class="blob-a"></div>
        <div class="blob-b"></div>
        <div class="sweep-wrap"><div class="sweep"></div></div>
      }

      <div class="scanlines" [class.live]="live()"></div>
      @if (live()) {
        <div class="scan"></div>
      }
      <div class="vignette"></div>

      @if (offline()) {
        <div class="no-signal">
          <mns-icon name="WifiOff" [size]="big() ? 34 : 24" />
          <span class="no-signal-label">{{ error() ? 'STREAM ERROR' : 'NO SIGNAL' }}</span>
        </div>
      }

      @if (live()) {
        <span class="live-pill">
          <span class="live-dot"></span>
          LIVE
        </span>
      }

      @if (!offline()) {
        <span class="preset-pill">{{ presetLabel() }}</span>
      }

      @if (live() && !audioEnabled()) {
        <span class="muted-pill">
          <mns-icon name="WifiOff" [size]="big() ? 12 : 10" />
          MUTED
        </span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .monitor {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow:
        inset 0 0 0 2px rgba(0, 0, 0, 0.4),
        0 18px 40px -26px rgba(0, 0, 0, 0.9);
    }
    .monitor.big {
      border-radius: 14px;
    }
    .blob-a {
      position: absolute;
      width: 55%;
      aspect-ratio: 1;
      left: 8%;
      top: 12%;
      border-radius: 50%;
      opacity: 0.6;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.32), transparent 70%);
      filter: blur(22px);
      animation: streamBlobA 9s ease-in-out infinite;
    }
    .blob-b {
      position: absolute;
      width: 48%;
      aspect-ratio: 1;
      right: 6%;
      bottom: 6%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.45), transparent 70%);
      filter: blur(20px);
      animation: streamBlobB 11s ease-in-out infinite;
    }
    .sweep-wrap {
      position: absolute;
      inset: 0;
      overflow: hidden;
      opacity: 0.35;
    }
    .sweep {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 38%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
      animation: streamSweep 6.5s linear infinite;
    }
    .scanlines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.25;
      background: repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.16) 0 1px, transparent 1px 3px);
    }
    .scanlines.live {
      opacity: 0.5;
    }
    .scan {
      position: absolute;
      left: 0;
      right: 0;
      height: 32%;
      pointer-events: none;
      background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.07), transparent);
      animation: streamScan 5s linear infinite;
    }
    .vignette {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.5)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 30%);
    }
    .no-signal {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.5);
      background: rgba(6, 9, 15, 0.5);
    }
    .no-signal-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .big .no-signal-label {
      font-size: 14px;
    }
    .live-pill {
      position: absolute;
      top: 8px;
      left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 99px;
      background: rgba(239, 71, 87, 0.92);
      color: #fff;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }
    .big .live-pill {
      top: 12px;
      left: 12px;
      padding: 4px 11px;
      font-size: 12px;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 99px;
      background: #fff;
      animation: pulseDot 1.4s ease-in-out infinite;
    }
    .big .live-dot {
      width: 7px;
      height: 7px;
    }
    .preset-pill {
      position: absolute;
      bottom: 8px;
      right: 8px;
      padding: 2px 7px;
      border-radius: 7px;
      background: rgba(4, 6, 11, 0.55);
      backdrop-filter: blur(4px);
      color: rgba(255, 255, 255, 0.92);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .big .preset-pill {
      bottom: 12px;
      right: 12px;
      padding: 3px 9px;
      font-size: 11px;
    }
    .muted-pill {
      position: absolute;
      bottom: 8px;
      left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      border-radius: 7px;
      background: rgba(4, 6, 11, 0.55);
      backdrop-filter: blur(4px);
      color: rgba(255, 255, 255, 0.7);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .big .muted-pill {
      bottom: 12px;
      left: 12px;
      padding: 3px 9px;
      font-size: 10.5px;
    }
    @media (prefers-reduced-motion: reduce) {
      .blob-a,
      .blob-b,
      .sweep,
      .scan,
      .live-dot {
        animation: none;
      }
    }
  `,
})
export class LiveStreamMonitor {
  readonly streamId = input.required<string>();
  readonly status = input.required<LiveStreamStatus>();
  readonly transcodingPreset = input.required<TranscodingPreset>();
  readonly audioEnabled = input<boolean>(true);
  readonly big = input<boolean>(false);

  protected readonly live = computed(() => this.status() === 'active');
  protected readonly offline = computed(() => this.status() !== 'active');
  protected readonly error = computed(() => this.status() === 'error');

  protected readonly gradient = computed(() => THUMBS[hashIndex(this.streamId(), THUMBS.length)]);

  protected readonly presetLabel = computed(
    () => TRANSCODING_PRESET_LABELS[this.transcodingPreset()] ?? this.transcodingPreset(),
  );
}
