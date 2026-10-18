import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { PtzCommand, PtzDirection } from './live-stream.model';

type ZoomDirection = 'in' | 'out';

interface PadCell {
  direction: PtzDirection;
  glyph: string;
}

export const PTZ_MIN_SPEED = 1;
export const PTZ_MAX_SPEED = 10;
export const PTZ_DEFAULT_SPEED = 5;
export const PTZ_ZOOM_SPEED = 4;
export const PTZ_PRESET_COUNT = 6;
/** Held moves are re-sent this often; the agent stops the camera after 1.5 s of silence. */
export const PTZ_HEARTBEAT_MS = 500;

const KEY_AXES: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * Dumb PTZ remote: 8-direction pad, stop, speed, zoom (hold), home and six
 * presets (recall, or store while "Save" mode is on). Emits {@link PtzCommand}s
 * only. While a direction or zoom is held, the active `move`/`zoom` is emitted
 * at once and then repeated every {@link PTZ_HEARTBEAT_MS} (keeps the agent's
 * dead-man alive); a change restarts the repeat, every release emits `stop`.
 */
@Component({
  selector: 'app-ptz-control-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `
    <div
      class="panel"
      *transloco="let t"
      role="group"
      [attr.aria-label]="t('liveStreams.ptz.panel.title')"
      (keydown)="onKeyDown($event)"
      (keyup)="onKeyUp($event)"
      (focusout)="onFocusOut($event)"
    >
      <div class="top">
        <div class="pad" role="group" [attr.aria-label]="t('liveStreams.ptz.panel.padAria')">
          @for (cell of cells; track cell.direction; let i = $index) {
            @if (i === 4) {
              <button
                type="button"
                class="pad-btn stop"
                [disabled]="disabled()"
                [attr.aria-label]="t('liveStreams.ptz.panel.stop')"
                (click)="stopAll()"
              >
                <span aria-hidden="true">■</span>
              </button>
            }
            <button
              type="button"
              class="pad-btn"
              [class.active]="activeDirection() === cell.direction"
              [disabled]="disabled()"
              [attr.aria-label]="t('liveStreams.ptz.panel.direction.' + cell.direction)"
              (pointerdown)="startMove(cell.direction)"
              (pointerup)="endMove()"
              (pointerleave)="endMove()"
              (pointercancel)="endMove()"
              (contextmenu)="$event.preventDefault()"
            >
              <span aria-hidden="true">{{ cell.glyph }}</span>
            </button>
          }
        </div>

        <div class="side">
          <label class="speed">
            <span class="label"> {{ t('liveStreams.ptz.panel.speed') }}: {{ speed() }} </span>
            <input
              type="range"
              [min]="minSpeed"
              [max]="maxSpeed"
              step="1"
              [value]="speed()"
              [disabled]="disabled()"
              [attr.aria-label]="t('liveStreams.ptz.panel.speedAria')"
              (input)="onSpeedInput($event)"
            />
          </label>

          <div class="zoom">
            <span class="label">{{ t('liveStreams.ptz.panel.zoom') }}</span>
            <div class="row">
              @for (dir of zoomDirections; track dir) {
                <button
                  type="button"
                  class="btn"
                  [class.active]="activeZoom() === dir"
                  [disabled]="disabled()"
                  [attr.aria-label]="t('liveStreams.ptz.panel.zoom_' + dir)"
                  (pointerdown)="startZoom(dir)"
                  (pointerup)="endZoom()"
                  (pointerleave)="endZoom()"
                  (pointercancel)="endZoom()"
                  (contextmenu)="$event.preventDefault()"
                >
                  <span aria-hidden="true">{{ dir === 'in' ? '+' : '−' }}</span>
                </button>
              }
              <button
                type="button"
                class="btn home"
                [disabled]="disabled()"
                (click)="emitCommand({ action: 'home' })"
              >
                {{ t('liveStreams.ptz.panel.home') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="presets">
        <div class="presets-head">
          <span class="label">{{ t('liveStreams.ptz.panel.presets') }}</span>
          <button
            type="button"
            class="btn save-toggle"
            [class.active]="saveMode()"
            [attr.aria-pressed]="saveMode()"
            [disabled]="disabled()"
            (click)="saveMode.set(!saveMode())"
          >
            {{ t('liveStreams.ptz.panel.save') }}
          </button>
        </div>
        <div class="row">
          @for (n of presetNumbers; track n) {
            <button
              type="button"
              class="btn preset"
              [class.saving]="saveMode()"
              [disabled]="disabled()"
              [attr.aria-label]="
                t(
                  saveMode()
                    ? 'liveStreams.ptz.panel.presetStoreAria'
                    : 'liveStreams.ptz.panel.presetRecallAria',
                  { n }
                )
              "
              (click)="onPreset(n - 1)"
            >
              {{ n }}
            </button>
          }
        </div>
        @if (saveMode()) {
          <p class="hint">{{ t('liveStreams.ptz.panel.saveHint') }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-start;
    }
    .pad {
      display: grid;
      grid-template-columns: repeat(3, 56px);
      grid-auto-rows: 56px;
      gap: 6px;
    }
    .side {
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      min-width: 180px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .pad-btn,
    .btn {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: var(--surface-2);
      color: var(--text);
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition:
        border-color 150ms,
        color 150ms,
        background 150ms;
    }
    .pad-btn {
      font-size: 20px;
    }
    .btn {
      min-width: 44px;
      min-height: 40px;
      padding: 0 12px;
      font-size: 14px;
    }
    .pad-btn:focus-visible,
    .btn:focus-visible,
    input[type='range']:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .pad-btn.active,
    .btn.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .pad-btn.stop {
      color: var(--color-offline);
    }
    .btn.preset.saving {
      border-style: dashed;
      border-color: var(--accent);
    }
    .pad-btn:disabled,
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .speed input {
      width: 100%;
      accent-color: var(--accent);
    }
    .hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--text-muted);
    }
    .presets-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .presets-head .label {
      margin: 0;
    }
  `,
})
export class PtzControlPanel {
  // Registered before `ptzCommand` so it runs before the output is torn down
  // and the final `stop` of a destroyed (hidden) panel still gets through.
  private readonly stopOnDestroy = inject(DestroyRef).onDestroy(() => this.releaseAll());

  readonly disabled = input(false);
  readonly ptzCommand = output<PtzCommand>();

  protected readonly minSpeed = PTZ_MIN_SPEED;
  protected readonly maxSpeed = PTZ_MAX_SPEED;
  protected readonly zoomDirections: readonly ZoomDirection[] = ['in', 'out'];
  protected readonly presetNumbers = Array.from({ length: PTZ_PRESET_COUNT }, (_, i) => i + 1);
  protected readonly cells: readonly PadCell[] = [
    { direction: 'up_left', glyph: '↖' },
    { direction: 'up', glyph: '↑' },
    { direction: 'up_right', glyph: '↗' },
    { direction: 'left', glyph: '←' },
    { direction: 'right', glyph: '→' },
    { direction: 'down_left', glyph: '↙' },
    { direction: 'down', glyph: '↓' },
    { direction: 'down_right', glyph: '↘' },
  ];

  protected readonly speed = signal(PTZ_DEFAULT_SPEED);
  protected readonly saveMode = signal(false);
  protected readonly activeDirection = signal<PtzDirection | null>(null);
  protected readonly activeZoom = signal<ZoomDirection | null>(null);

  private readonly pressedKeys = new Set<string>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      if (this.disabled()) this.releaseAll();
    });
  }

  protected startMove(direction: PtzDirection): void {
    if (this.disabled() || this.activeDirection() === direction) return;
    this.activeZoom.set(null);
    this.activeDirection.set(direction);
    this.startHeartbeat(() => ({ action: 'move', direction, speed: this.speed() }));
  }

  protected endMove(): void {
    if (this.activeDirection() === null) return;
    this.activeDirection.set(null);
    this.stopHeartbeat();
    this.emitCommand({ action: 'stop' });
  }

  protected startZoom(direction: ZoomDirection): void {
    if (this.disabled() || this.activeZoom() === direction) return;
    this.activeDirection.set(null);
    this.activeZoom.set(direction);
    this.startHeartbeat(() => ({ action: 'zoom', direction, speed: PTZ_ZOOM_SPEED }));
  }

  protected endZoom(): void {
    if (this.activeZoom() === null) return;
    this.activeZoom.set(null);
    this.stopHeartbeat();
    this.emitCommand({ action: 'stop' });
  }

  /** Explicit stop button: always emits exactly one `stop`. */
  protected stopAll(): void {
    this.clearHold();
    this.emitCommand({ action: 'stop' });
  }

  /** Clears hold state; emits `stop` only if something was active. */
  private releaseAll(): void {
    const wasActive = this.activeDirection() !== null || this.activeZoom() !== null;
    this.clearHold();
    if (wasActive) this.emitCommand({ action: 'stop' });
  }

  private clearHold(): void {
    this.stopHeartbeat();
    this.pressedKeys.clear();
    this.activeDirection.set(null);
    this.activeZoom.set(null);
  }

  /** Emits the held command now and again every {@link PTZ_HEARTBEAT_MS}. */
  private startHeartbeat(build: () => PtzCommand): void {
    this.stopHeartbeat();
    this.emitCommand(build());
    this.heartbeat = setInterval(() => this.emitCommand(build()), PTZ_HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  protected onSpeedInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.speed.set(Math.min(PTZ_MAX_SPEED, Math.max(PTZ_MIN_SPEED, Math.round(value))));
    }
  }

  protected onPreset(index: number): void {
    if (this.saveMode()) {
      this.emitCommand({ action: 'preset_store', preset: index });
      this.saveMode.set(false);
    } else {
      this.emitCommand({ action: 'preset_recall', preset: index });
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (!this.isPadKey(event)) return;
    event.preventDefault();
    this.pressedKeys.add(event.key);
    this.syncKeyDirection();
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (!this.isPadKey(event)) return;
    event.preventDefault();
    this.pressedKeys.delete(event.key);
    this.syncKeyDirection();
  }

  protected onFocusOut(event: FocusEvent): void {
    const panel = event.currentTarget as HTMLElement;
    if (panel.contains(event.relatedTarget as Node | null)) return;
    if (this.pressedKeys.size > 0) {
      this.pressedKeys.clear();
      this.endMove();
    }
  }

  protected emitCommand(command: PtzCommand): void {
    this.ptzCommand.emit(command);
  }

  private isPadKey(event: KeyboardEvent): boolean {
    if (this.disabled() || !(event.key in KEY_AXES)) return false;
    // The speed slider uses the arrow keys itself.
    return (event.target as HTMLElement | null)?.tagName !== 'INPUT';
  }

  private syncKeyDirection(): void {
    const direction = this.directionFromKeys();
    if (direction) this.startMove(direction);
    else this.endMove();
  }

  private directionFromKeys(): PtzDirection | null {
    const axes = new Set([...this.pressedKeys].map((k) => KEY_AXES[k]));
    const vertical = axes.has('up') !== axes.has('down') ? (axes.has('up') ? 'up' : 'down') : null;
    const horizontal =
      axes.has('left') !== axes.has('right') ? (axes.has('left') ? 'left' : 'right') : null;
    if (vertical && horizontal) return `${vertical}_${horizontal}` as PtzDirection;
    return vertical ?? horizontal;
  }
}
