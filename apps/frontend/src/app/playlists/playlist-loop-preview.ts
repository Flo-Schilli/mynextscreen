import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { PlaylistItem } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { CardComponent, CardHeadComponent, BadgeComponent, IconComponent } from '../ui';

/** Playlist-seconds advanced per real second so the loop is watchable. */
const PREVIEW_SPEED = 3;

/**
 * Client-side live loop preview: a 16:9 monitor frame, play/prev/next controls
 * and a segmented timeline that advances through the playlist items at an
 * accelerated speed using `requestAnimationFrame`. Honours
 * `prefers-reduced-motion` by never auto-animating. Purely presentational —
 * the loop is reconstructed from the item durations.
 */
@Component({
  selector: 'app-playlist-loop-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeadComponent, BadgeComponent, IconComponent],
  template: `
    <mns-card>
      @if (items().length === 0) {
        <mns-card-head title="Loop preview" sub="Add content to preview the loop" icon="Eye" />
        <div
          class="grid place-items-center py-10 px-5 rounded-[12px] border-[1.5px] border-dashed border-border-strong bg-surface-2 text-faint gap-2"
        >
          <mns-icon name="Playlists" [size]="26" />
          <span class="text-[13px] font-semibold">Empty playlist</span>
        </div>
      } @else {
        <mns-card-head title="Loop preview" [sub]="subText()" icon="Eye">
          <mns-badge slot="right" [tone]="playing() ? 'online' : 'neutral'">
            {{ playing() ? 'Playing' : 'Paused' }}
          </mns-badge>
        </mns-card-head>

        <div class="grid gap-4 items-center grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_1fr]">
          <!-- monitor -->
          <div
            class="p-3.5 rounded-[16px] border border-border"
            style="background: radial-gradient(130% 130% at 50% -10%, #0d1320, #06080d)"
          >
            <div
              class="relative w-full aspect-[16/9] rounded-[10px] overflow-hidden bg-[#05070c]"
              style="border: 1px solid rgba(255,255,255,.13)"
            >
              @if (current()?.content?.type === 'image') {
                <img [src]="thumbUrl()(current()!)" alt="" class="w-full h-full object-cover" />
              } @else {
                <span class="absolute inset-0 grid place-items-center">
                  <span
                    class="grid place-items-center w-12 h-12 rounded-full bg-black/40 text-white"
                  >
                    <mns-icon name="Play" [size]="18" />
                  </span>
                </span>
              }
              <div
                class="absolute left-2 bottom-2 max-w-[calc(100%-16px)] px-2.5 py-[3px] rounded-[99px] text-[11px] font-semibold text-white truncate"
                style="background: rgba(4,6,11,.6); backdrop-filter: blur(4px)"
              >
                {{ current()?.content?.title || 'Untitled' }}
              </div>
            </div>
          </div>

          <!-- controls + now playing -->
          <div class="flex flex-col gap-[13px]">
            <div class="flex items-center gap-2.5">
              <button
                type="button"
                title="Previous"
                class="grid place-items-center w-[38px] h-[38px] rounded-[10px] border border-border-strong bg-surface text-muted"
                (click)="prev()"
              >
                <mns-icon name="Chevron" [size]="17" style="transform: rotate(180deg)" />
              </button>
              <button
                type="button"
                [title]="playing() ? 'Pause' : 'Play'"
                class="grid place-items-center w-[52px] h-[52px] rounded-[99px] text-white play-btn"
                (click)="toggle()"
              >
                @if (playing()) {
                  <span class="flex gap-1">
                    <span class="block w-1 h-3.5 bg-white rounded-[1px]"></span>
                    <span class="block w-1 h-3.5 bg-white rounded-[1px]"></span>
                  </span>
                } @else {
                  <mns-icon name="Play" [size]="20" />
                }
              </button>
              <button
                type="button"
                title="Next"
                class="grid place-items-center w-[38px] h-[38px] rounded-[10px] border border-border-strong bg-surface text-muted"
                (click)="next()"
              >
                <mns-icon name="Chevron" [size]="17" />
              </button>
            </div>
            <div>
              <div class="text-[11.5px] text-muted mb-1">Now playing · item {{ idx() + 1 }}</div>
              <div class="text-[14.5px] font-bold truncate">
                {{ current()?.content?.title || '—' }}
              </div>
              <div class="font-mono text-[12px] text-faint mt-0.5">
                {{ format.formatDuration(elapsedSecs()) }} /
                {{ format.formatDuration(currentDur()) }}
              </div>
            </div>
          </div>
        </div>

        <!-- segmented timeline -->
        <div class="flex gap-[3px] mt-4">
          @for (item of items(); track item.id; let i = $index) {
            <button
              type="button"
              [title]="'Jump to item ' + (i + 1)"
              class="relative h-[7px] rounded-[99px] overflow-hidden min-w-[8px] cursor-pointer p-0 border-0 bg-[var(--track)]"
              [style.flex]="item.durationSeconds || 1"
              (click)="seek(i)"
            >
              <span
                class="absolute inset-0 origin-left"
                [style.transform]="'scaleX(' + fill(i) + ')'"
                [style.background]="i === idx() ? 'var(--accent)' : 'var(--accent-2)'"
                [style.opacity]="i === idx() ? 1 : 0.65"
              ></span>
            </button>
          }
        </div>
      }
    </mns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .play-btn {
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 10px 24px -10px var(--accent-ring);
      cursor: pointer;
    }
  `,
})
export class PlaylistLoopPreview {
  readonly items = input.required<PlaylistItem[]>();
  readonly thumbUrl = input.required<(item: PlaylistItem) => string>();

  protected readonly format = inject(PlaylistFormatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idx = signal(0);
  /** Seconds into the current item (playlist-time, not real-time). */
  protected readonly elapsed = signal(0);
  protected readonly playing = signal(false);

  private rafId = 0;
  private lastFrame = 0;
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  protected readonly current = computed<PlaylistItem | undefined>(() => this.items()[this.idx()]);
  protected readonly currentDur = computed(() => this.current()?.durationSeconds ?? 0);
  protected readonly elapsedSecs = computed(() => Math.round(this.elapsed()));

  protected readonly subText = computed(() => {
    const count = this.items().length;
    const total = this.format.totalDurationSeconds(this.items());
    return `${count} items · ${this.format.formatDuration(total)} total · loops`;
  });

  constructor() {
    // Keep idx in range when items change.
    effect(() => {
      const len = this.items().length;
      if (this.idx() >= len && len > 0) {
        this.idx.set(0);
        this.elapsed.set(0);
      }
    });

    this.destroyRef.onDestroy(() => this.stopRaf());
  }

  protected fill(i: number): number {
    const active = this.idx();
    if (i < active) return 1;
    if (i > active) return 0;
    const dur = this.currentDur();
    return dur > 0 ? Math.min(1, this.elapsed() / dur) : 0;
  }

  protected toggle(): void {
    if (this.items().length === 0) return;
    if (this.idx() >= this.items().length) this.idx.set(0);
    if (this.playing()) {
      this.playing.set(false);
      this.stopRaf();
    } else {
      this.playing.set(true);
      if (!this.reducedMotion) {
        this.lastFrame = performance.now();
        this.rafId = requestAnimationFrame((t) => this.tick(t));
      }
    }
  }

  protected prev(): void {
    const len = this.items().length;
    if (!len) return;
    this.seek(this.idx() === 0 ? len - 1 : this.idx() - 1);
  }

  protected next(): void {
    const len = this.items().length;
    if (!len) return;
    this.seek(this.idx() === len - 1 ? 0 : this.idx() + 1);
  }

  protected seek(i: number): void {
    this.idx.set(i);
    this.elapsed.set(0);
  }

  private tick(now: number): void {
    const dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    const cur = this.current();
    if (!cur) {
      this.stopRaf();
      this.playing.set(false);
      return;
    }
    const ne = this.elapsed() + dt * PREVIEW_SPEED;
    if (ne >= cur.durationSeconds) {
      const nextIdx = this.idx() + 1;
      if (nextIdx >= this.items().length) {
        this.idx.set(0);
        this.elapsed.set(0);
      } else {
        this.idx.set(nextIdx);
        this.elapsed.set(0);
      }
    } else {
      this.elapsed.set(ne);
    }
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private stopRaf(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}
