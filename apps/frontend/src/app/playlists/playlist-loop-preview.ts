import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { PlaylistItem } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { CardComponent, CardHeadComponent, BadgeComponent, IconComponent } from '../ui';

/**
 * Client-side loop preview that plays the playlist the way the screen player
 * does: a 16:9 monitor frame renders the actual media (`object-contain` on
 * black), images hold for their configured duration and videos play in real
 * time (muted, inline) and advance when they end. Play/pause, prev/next and a
 * clickable segmented timeline drive a single `requestAnimationFrame` loop that
 * keeps the elapsed counter and timeline fill in sync — for videos the elapsed
 * value is read straight from the `<video>` element. Purely presentational: the
 * sequence is reconstructed from the item durations.
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
                <img [src]="thumbUrl()(current()!)" alt="" class="w-full h-full object-contain" />
              } @else if (current()?.content?.type === 'video') {
                <video
                  #previewVideo
                  [src]="mediaUrl()(current()!)"
                  class="w-full h-full object-contain bg-black"
                  [muted]="muted()"
                  playsinline
                  preload="auto"
                  (ended)="onVideoEnded()"
                  (error)="onMediaError()"
                ></video>
                @if (muted()) {
                  <button
                    type="button"
                    title="Unmute"
                    class="absolute right-2 top-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[99px] text-[11px] font-semibold text-white cursor-pointer"
                    style="background: rgba(4,6,11,.6); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,.13)"
                    (click)="unmute()"
                  >
                    <span aria-hidden="true">🔇</span> Unmute
                  </button>
                }
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
                <mns-icon name="ChevronLeft" [size]="17" />
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
  /** Builds a still/poster URL for an item (used by the `<img>` branch). */
  readonly thumbUrl = input.required<(item: PlaylistItem) => string>();
  /** Builds the playable media URL for an item (used by the `<video>` branch). */
  readonly mediaUrl = input.required<(item: PlaylistItem) => string>();

  protected readonly format = inject(PlaylistFormatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('previewVideo');

  protected readonly idx = signal(0);
  /** Seconds into the current item (real-time). */
  protected readonly elapsed = signal(0);
  protected readonly playing = signal(false);
  /** Videos autoplay muted (browser policy); the user can opt into sound. */
  protected readonly muted = signal(true);

  private rafId = 0;
  private lastFrame = 0;
  /** Item-id ordering last seen, used to detect reorder/add/remove. */
  private lastOrderKey = '';

  protected readonly current = computed<PlaylistItem | undefined>(() => this.items()[this.idx()]);
  protected readonly currentDur = computed(() => this.current()?.durationSeconds ?? 0);
  protected readonly elapsedSecs = computed(() => Math.round(this.elapsed()));

  protected readonly subText = computed(() => {
    const count = this.items().length;
    const total = this.format.totalDurationSeconds(this.items());
    return `${count} items · ${this.format.formatDuration(total)} total · loops`;
  });

  constructor() {
    // Jump back to the start of the first item whenever the sequence order or
    // membership changes (reorder, add, remove). In-place edits like duration
    // or transition tweaks keep the ids and their order, so they don't reset.
    effect(() => {
      const key = this.items()
        .map((i) => i.id)
        .join('|');
      if (key !== this.lastOrderKey) {
        this.lastOrderKey = key;
        this.idx.set(0);
        this.elapsed.set(0);
      }
    });

    // Drive the <video> element from play/pause + which item is current.
    effect(() => {
      const item = this.current();
      const isPlaying = this.playing();
      const video = this.videoRef()?.nativeElement;
      if (!video || item?.content?.type !== 'video') return;
      video.muted = this.muted();
      if (isPlaying) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
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
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame((t) => this.tick(t));
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

  protected unmute(): void {
    this.muted.set(false);
    const video = this.videoRef()?.nativeElement;
    if (video) video.muted = false;
  }

  protected onVideoEnded(): void {
    if (!this.playing()) return;
    // Single-item playlist: the index can't change, so restart the video.
    if (this.items().length <= 1) {
      const video = this.videoRef()?.nativeElement;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => undefined);
      }
      this.elapsed.set(0);
      return;
    }
    this.goNext();
  }

  protected onMediaError(): void {
    // Skip broken/not-yet-transcoded items so the loop keeps running.
    if (this.playing() && this.items().length > 1) this.goNext();
  }

  private goNext(): void {
    const len = this.items().length;
    if (!len) return;
    this.idx.set(this.idx() === len - 1 ? 0 : this.idx() + 1);
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

    if (cur.content?.type === 'video') {
      // Videos play in real time; the element drives elapsed and advances on end.
      const video = this.videoRef()?.nativeElement;
      if (video && Number.isFinite(video.currentTime)) {
        this.elapsed.set(video.currentTime);
      }
    } else {
      // Images (and anything non-video) hold for their configured duration.
      const ne = this.elapsed() + dt;
      if (ne >= this.currentDur()) {
        this.goNext();
      } else {
        this.elapsed.set(ne);
      }
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
