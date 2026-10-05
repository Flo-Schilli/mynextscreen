/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

export interface LoadData {
  cpu: number[];
  ram: number[];
  transcodeWindows: [number, number][];
  cores: number;
  ramTotalGB: number;
  cpuNow: number;
  ramNow: number;
  cpuPeak: number;
  ramPeak: number;
}

/**
 * SVG system-load chart — CPU solid line + gradient area, RAM dashed line,
 * transcode-window shading, y-grid, x-ticks, end dots.
 *
 * viewBox 0 0 1000 240 scales uniformly so strokes/text stay crisp.
 */
@Component({
  selector: 'mns-load-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `
    <svg
      *transloco="let t"
      viewBox="0 0 1000 240"
      width="100%"
      style="display:block;height:auto"
      role="img"
      [attr.aria-label]="t('admin.dashboard.systemLoad.chartAria')"
    >
      <defs>
        <linearGradient id="lgCpuGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--accent)" stop-opacity="0.34" />
          <stop offset="1" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- grid lines + y-labels -->
      @for (g of gridLines(); track g.v) {
        <line
          [attr.x1]="L"
          [attr.x2]="W - R"
          [attr.y1]="g.y"
          [attr.y2]="g.y"
          stroke="var(--border)"
          stroke-width="1"
          [attr.stroke-dasharray]="g.v === 0 ? '0' : '4 5'"
        />
        @if (g.label) {
          <text
            [attr.x]="L - 9"
            [attr.y]="g.y"
            fill="var(--text-faint)"
            font-size="15"
            text-anchor="end"
            dominant-baseline="middle"
            font-family="var(--font-mono)"
          >
            {{ g.label }}
          </text>
        }
      }

      <!-- transcode-window shading -->
      @for (win of load().transcodeWindows; track $index) {
        <rect
          [attr.x]="xPos(win[0])"
          [attr.y]="T"
          [attr.width]="xPos(win[1]) - xPos(win[0])"
          [attr.height]="H - T - B"
          fill="var(--accent-soft)"
        />
        <line
          [attr.x1]="xPos(win[0])"
          [attr.x2]="xPos(win[0])"
          [attr.y1]="T"
          [attr.y2]="H - B"
          stroke="var(--accent)"
          stroke-width="1"
          stroke-opacity="0.4"
        />
      }

      <!-- CPU gradient area -->
      <path [attr.d]="cpuArea()" fill="url(#lgCpuGrad)" />

      <!-- CPU solid line -->
      <path
        [attr.d]="cpuLine()"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2.4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- RAM dashed line (on top) -->
      <path
        [attr.d]="ramLine()"
        fill="none"
        stroke="var(--color-info)"
        stroke-width="2.4"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke-dasharray="6 4"
      />

      <!-- end dots -->
      <circle
        [attr.cx]="xPos(lastIdx())"
        [attr.cy]="yPos(load().ramNow)"
        r="4.5"
        fill="var(--color-info)"
        stroke="var(--surface)"
        stroke-width="2.5"
      />
      <circle
        [attr.cx]="xPos(lastIdx())"
        [attr.cy]="yPos(load().cpuNow)"
        r="4.5"
        fill="var(--accent)"
        stroke="var(--surface)"
        stroke-width="2.5"
      />

      <!-- x-tick labels -->
      @for (tick of xTicks(); track tick.label) {
        <text
          [attr.x]="tick.x"
          [attr.y]="H - 9"
          fill="var(--text-faint)"
          font-size="15"
          [attr.text-anchor]="tick.anchor"
          font-family="var(--font-mono)"
        >
          {{ tick.label }}
        </text>
      }
    </svg>
  `,
  host: { style: 'display:contents' },
})
export class LoadGraphComponent {
  private readonly transloco = inject(TranslocoService);

  readonly load = input.required<LoadData>();

  // chart geometry constants
  readonly W = 1000;
  readonly H = 240;
  readonly L = 46;
  readonly R = 14;
  readonly T = 16;
  readonly B = 30;

  readonly lastIdx = computed(() => this.load().cpu.length - 1);

  xPos(i: number): number {
    const n = this.load().cpu.length;
    return this.L + (i / (n - 1)) * (this.W - this.L - this.R);
  }

  yPos(v: number): number {
    return this.T + (1 - v / 100) * (this.H - this.T - this.B);
  }

  private buildLine(arr: number[]): string {
    return arr
      .map((v, i) => `${i ? 'L' : 'M'}${this.xPos(i).toFixed(1)} ${this.yPos(v).toFixed(1)}`)
      .join(' ');
  }

  readonly cpuLine = computed(() => this.buildLine(this.load().cpu));
  readonly ramLine = computed(() => this.buildLine(this.load().ram));

  readonly cpuArea = computed(() => {
    const n = this.load().cpu.length;
    const line = this.buildLine(this.load().cpu);
    return `${line} L${this.xPos(n - 1).toFixed(1)} ${this.yPos(0).toFixed(1)} L${this.xPos(0).toFixed(1)} ${this.yPos(0).toFixed(1)} Z`;
  });

  readonly gridLines = computed(() => {
    const vals = [0, 25, 50, 75, 100];
    return vals.map((v) => ({
      v,
      y: this.yPos(v),
      label: v === 0 || v === 50 || v === 100 ? `${v}%` : null,
    }));
  });

  readonly xTicks = computed(() => {
    const n = this.load().cpu.length;
    const ticks: { i: number; label: string }[] = [
      { i: 0, label: this.transloco.translate('admin.dashboard.systemLoad.ticks.start') },
      { i: Math.round((n - 1) / 4), label: '18h' },
      { i: Math.round((n - 1) / 2), label: '12h' },
      { i: Math.round(((n - 1) * 3) / 4), label: '6h' },
      { i: n - 1, label: this.transloco.translate('admin.dashboard.systemLoad.ticks.now') },
    ];
    return ticks.map((t) => ({
      label: t.label,
      x: Math.min(Math.max(this.xPos(t.i), this.L + 16), this.W - this.R - 12),
      anchor: t.i === 0 ? 'start' : t.i === n - 1 ? 'end' : 'middle',
    }));
  });
}
