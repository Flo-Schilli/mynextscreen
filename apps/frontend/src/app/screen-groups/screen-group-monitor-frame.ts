import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, StatusDotComponent, StatusDotStatus } from '../ui';

/** Visual source for a monitor: a background (image url or CSS gradient) + label + media type. */
export interface MonitorContent {
  /** CSS background value: gradient string or `url(...)`. */
  bg: string;
  /** Big watermark label drawn over the content. */
  label: string;
  type: 'image' | 'video';
}

/** Slice geometry for a split video-wall panel. */
export interface MonitorSlice {
  r: number;
  c: number;
  rows: number;
  cols: number;
}

/**
 * A single monitor frame: a bezelled screen rendering optional content (whole or
 * a sliced region of a video wall), an optional bottom label with status dot, or
 * a dashed empty state. Overlay controls (the wall-cell button/popover) are
 * projected via the default slot. Purely presentational.
 */
@Component({
  selector: 'app-screen-group-monitor-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusDotComponent],
  template: `
    <div class="monitor-frame" [class.square]="square()">
      @if (empty()) {
        <div class="empty-state">
          <mns-icon name="Plus" [size]="16" />
          <span class="empty-label">Empty</span>
        </div>
      } @else if (content(); as c) {
        <div class="content-bg" [style.background]="c.bg" [style]="sliceStyle()">
          <div class="content-label" [style.font-size]="labelFontSize()">{{ c.label }}</div>
        </div>
        <div class="content-sheen"></div>
        @if (c.type === 'video' && !slice()) {
          <span class="play-badge"><mns-icon name="Play" [size]="14" /></span>
        }
        @if (label()) {
          <div class="screen-label">
            <mns-status-dot [status]="status()" [size]="6" />
            <span class="screen-label-text">{{ label() }}</span>
          </div>
        }
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    .monitor-frame {
      position: relative;
      height: 100%;
      border-radius: 9px;
      overflow: hidden;
      container-type: size;
      background: #05070c;
      border: 1px solid rgba(255, 255, 255, 0.13);
      box-shadow:
        inset 0 0 0 2px rgba(0, 0, 0, 0.5),
        0 12px 28px -18px rgba(0, 0, 0, 0.9);
    }
    /* Flush, square panels for a contiguous video-wall surface (split mode). */
    .monitor-frame.square,
    .monitor-frame.square .empty-state {
      border-radius: 0;
    }
    .empty-state {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      gap: 4px;
      border: 1.5px dashed rgba(255, 255, 255, 0.15);
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-faint);
    }
    .empty-label {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .content-bg {
      position: absolute;
      display: grid;
      place-items: center;
      inset: 0;
    }
    .content-label {
      font-weight: 900;
      letter-spacing: -0.04em;
      color: rgba(255, 255, 255, 0.96);
      line-height: 0.85;
      white-space: nowrap;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.28);
    }
    .content-sheen {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.14),
        transparent 42%,
        rgba(0, 0, 0, 0.28)
      );
    }
    .play-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: 26cqh;
      height: 26cqh;
      border-radius: 99px;
      background: rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(3px);
      color: #fff;
    }
    .screen-label {
      position: absolute;
      left: 7px;
      bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 99px;
      background: rgba(4, 6, 11, 0.62);
      backdrop-filter: blur(4px);
      font-size: 10.5px;
      font-weight: 600;
      color: #fff;
      max-width: calc(100% - 14px);
    }
    .screen-label-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class ScreenGroupMonitorFrame {
  readonly content = input<MonitorContent | null>(null);
  readonly slice = input<MonitorSlice | null>(null);
  readonly label = input<string | null>(null);
  readonly status = input<StatusDotStatus>('online');
  readonly empty = input<boolean>(false);
  /** Render with no rounded corners so panels tile into a seamless wall. */
  readonly square = input<boolean>(false);

  readonly sliceStyle = computed<Record<string, string>>(() => {
    const s = this.slice();
    if (!s) return {} as Record<string, string>;
    return {
      width: `${s.cols * 100}%`,
      height: `${s.rows * 100}%`,
      left: `${-s.c * 100}%`,
      top: `${-s.r * 100}%`,
      inset: 'auto',
    };
  });

  readonly labelFontSize = computed(() => {
    const s = this.slice();
    return s ? `${s.rows * 30}cqh` : '30cqh';
  });
}
