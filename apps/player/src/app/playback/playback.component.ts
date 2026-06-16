import {
  Component,
  inject,
  signal,
  computed,
  untracked,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  effect,
  NgZone,
} from '@angular/core';
import { PlayerService } from '../player/player.service';
import { TimeSyncService } from '../player/time-sync.service';
import { ConnectionService } from '../connection/connection.service';
import { PlaylistItem } from '../player/player.models';
import { PlaybackStateService } from './playback-state.service';
import { StatusOverlayComponent } from './status-overlay.component';
import { LiveStreamViewComponent } from './live-stream-view.component';
import { resolveTransition, enterAnim, exitAnim, TransitionSpec } from './playback-transitions';
import { computePosition } from './playlist-clock';

type LayerId = 0 | 1;

/**
 * Smart container + dual-layer transition engine for screen playback. Owns the
 * playlist sequencing, the two crossfading content layers, transition timing and
 * the playback mode selection. The live-stream (HLS) view is delegated to a
 * self-contained child; the status overlay and next-image preload stay inline.
 *
 * Item timing is anchored to a shared epoch + the synchronized server clock
 * (see {@link computePosition}), so every screen in a mirror/split group lands on
 * the same item at the same moment and switches together — split groups run this
 * exact same loop, just with per-screen sliced item URLs from the screen state.
 */
@Component({
  selector: 'app-playback',
  imports: [StatusOverlayComponent, LiveStreamViewComponent],
  template: `
    <div class="playback-container">
      @if (isLiveStreaming()) {
        <app-live-stream-view [streamId]="liveStreamId()" />
      } @else if (isPending()) {
        <div class="no-content">
          <p class="text-text-muted text-lg">Preparing content…</p>
        </div>
      } @else if (noContent()) {
        <div class="no-content">
          <img src="default-screen.png" class="default-screen-image" alt="" />
        </div>
      } @else {
        <!-- Transition Layer 0 -->
        <div
          class="content-layer"
          [class.layer-active]="activeLayer() === 0 && !isTransitioning()"
          [class.layer-inactive]="activeLayer() !== 0 && !isTransitioning()"
          [style.animation]="layer0Anim()"
          [style.z-index]="layer0ZIndex()"
        >
          @if (layer0Item()?.type === 'image') {
            <img
              [src]="layer0MediaUrl()"
              class="content-media"
              alt=""
              (load)="onLayerImageLoaded(0)"
              (error)="onMediaError($event)"
            />
          } @else if (layer0Item()?.type === 'video') {
            <video
              #layer0Video
              [src]="layer0MediaUrl()"
              class="content-media"
              autoplay
              muted
              playsinline
              (loadeddata)="onLayerVideoReady(0)"
              (error)="onMediaError($event)"
            ></video>
          }
        </div>

        <!-- Transition Layer 1 -->
        <div
          class="content-layer"
          [class.layer-active]="activeLayer() === 1 && !isTransitioning()"
          [class.layer-inactive]="activeLayer() !== 1 && !isTransitioning()"
          [style.animation]="layer1Anim()"
          [style.z-index]="layer1ZIndex()"
        >
          @if (layer1Item()?.type === 'image') {
            <img
              [src]="layer1MediaUrl()"
              class="content-media"
              alt=""
              (load)="onLayerImageLoaded(1)"
              (error)="onMediaError($event)"
            />
          } @else if (layer1Item()?.type === 'video') {
            <video
              #layer1Video
              [src]="layer1MediaUrl()"
              class="content-media"
              autoplay
              muted
              playsinline
              (loadeddata)="onLayerVideoReady(1)"
              (error)="onMediaError($event)"
            ></video>
          }
        </div>

        @if (isMuted() && currentItem()?.type === 'video') {
          <button class="unmute-overlay" (click)="unmute()" (keydown.enter)="unmute()">
            <span class="unmute-icon">🔇</span>
            <span class="text-sm">Click to unmute</span>
          </button>
        }
      }

      <app-status-overlay />

      <!-- Preload next image (hidden) -->
      @if (nextMediaUrl()) {
        <img [src]="nextMediaUrl()" class="preload-image" alt="" aria-hidden="true" />
      }
    </div>
  `,
  styles: [
    `
      .playback-container {
        position: relative;
        width: 100vw;
        height: 100vh;
        background: #000;
        overflow: hidden;
      }

      .no-content {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: #000;
      }

      .default-screen-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .content-layer {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .layer-active {
        opacity: 1;
      }

      .layer-inactive {
        opacity: 0;
        pointer-events: none;
      }

      .content-media {
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .unmute-overlay {
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: rgba(0, 0, 0, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.5rem;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        backdrop-filter: blur(4px);
        z-index: 10;
        transition: background 0.2s;
      }

      .unmute-overlay:hover {
        background: rgba(0, 0, 0, 0.9);
      }

      .unmute-icon {
        font-size: 1.25rem;
      }

      .preload-image {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }

      /* ── Transition keyframes ── */

      /* Fade */
      @keyframes fade-enter {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes fade-exit {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      /* Slide Left — outgoing exits left, incoming enters from right */
      @keyframes slide-left-enter {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes slide-left-exit {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-100%);
        }
      }

      /* Slide Right — outgoing exits right, incoming enters from left */
      @keyframes slide-right-enter {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes slide-right-exit {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(100%);
        }
      }

      /* Slide Up — outgoing exits upward, incoming enters from below */
      @keyframes slide-up-enter {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      @keyframes slide-up-exit {
        from {
          transform: translateY(0);
        }
        to {
          transform: translateY(-100%);
        }
      }

      /* Slide Down — outgoing exits downward, incoming enters from above */
      @keyframes slide-down-enter {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }
      @keyframes slide-down-exit {
        from {
          transform: translateY(0);
        }
        to {
          transform: translateY(100%);
        }
      }

      /* Zoom In — outgoing scales up and fades out, incoming fades in */
      @keyframes zoom-in-enter {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes zoom-in-exit {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(1.5);
        }
      }

      /* Zoom Out — outgoing scales down and fades out, incoming fades in */
      @keyframes zoom-out-enter {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes zoom-out-exit {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.5);
        }
      }
    `,
  ],
})
export class PlaybackComponent implements OnInit, OnDestroy {
  private readonly playerService = inject(PlayerService);
  private readonly timeSync = inject(TimeSyncService);
  private readonly connectionService = inject(ConnectionService);
  private readonly playbackState = inject(PlaybackStateService);
  private readonly zone = inject(NgZone);

  private readonly layer0Video = viewChild<ElementRef<HTMLVideoElement>>('layer0Video');
  private readonly layer1Video = viewChild<ElementRef<HTMLVideoElement>>('layer1Video');

  private readonly _currentIndex = signal(0);
  private readonly _activeLayer = signal<LayerId>(0);
  private readonly _layer0Item = signal<PlaylistItem | null>(null);
  private readonly _layer1Item = signal<PlaylistItem | null>(null);
  private readonly _layer0Anim = signal('');
  private readonly _layer1Anim = signal('');
  private readonly _isTransitioning = signal(false);
  private readonly _initialLoad = signal(true);
  private readonly _isMuted = signal(true);
  private readonly _isPending = signal(false);

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private _pendingTransition: TransitionSpec | null = null;
  private _isPendingImageLoad = false;
  /** Offset (ms) to seek the active video to on first appearance after a clock re-anchor. */
  private _pendingSeekOffsetMs = 0;

  readonly isMuted = this._isMuted.asReadonly();
  readonly isPending = this._isPending.asReadonly();
  readonly activeLayer = this._activeLayer.asReadonly();
  readonly isTransitioning = this._isTransitioning.asReadonly();
  readonly layer0Item = this._layer0Item.asReadonly();
  readonly layer1Item = this._layer1Item.asReadonly();
  readonly layer0Anim = this._layer0Anim.asReadonly();
  readonly layer1Anim = this._layer1Anim.asReadonly();

  readonly isLiveStreaming = computed(() => this.playerService.isLiveStreaming());
  readonly liveStreamId = computed(() => this.playerService.activeLiveStream()?.id ?? null);

  readonly items = computed(() => {
    const playlist = this.playerService.activePlaylist();
    return playlist?.items ?? [];
  });

  readonly noContent = computed(() => this.items().length === 0);

  readonly currentItem = computed((): PlaylistItem | null => {
    return this._activeLayer() === 0 ? this._layer0Item() : this._layer1Item();
  });

  readonly nextItem = computed((): PlaylistItem | null => {
    const list = this.items();
    if (list.length <= 1) return null;
    const idx = this._currentIndex();
    return list[(idx + 1) % list.length] ?? null;
  });

  readonly layer0MediaUrl = computed(() => {
    const item = this._layer0Item();
    return item ? this.buildMediaUrl(item.url) : '';
  });

  readonly layer1MediaUrl = computed(() => {
    const item = this._layer1Item();
    return item ? this.buildMediaUrl(item.url) : '';
  });

  readonly nextMediaUrl = computed(() => {
    const item = this.nextItem();
    if (!item) return '';
    if (item.type === 'video') return ''; // don't preload videos
    return this.buildMediaUrl(item.url);
  });

  readonly layer0ZIndex = computed(() => {
    const onTop = this._isTransitioning()
      ? this._activeLayer() !== 0 // entering (inactive) layer on top
      : this._activeLayer() === 0; // active layer on top
    return onTop ? 2 : 1;
  });

  readonly layer1ZIndex = computed(() => {
    const onTop = this._isTransitioning() ? this._activeLayer() !== 1 : this._activeLayer() === 1;
    return onTop ? 2 : 1;
  });

  constructor() {
    // Re-anchor playback to the shared clock whenever the active playlist or the
    // group epoch changes, and once the first clock sync completes (so a screen
    // that started before its offset was known snaps onto the group timeline).
    // `synced` flips true only once, so periodic re-syncs refresh the offset
    // without re-initialising playback — ongoing drift is corrected because each
    // scheduleAdvance() re-reads serverNow() for the next boundary.
    effect(() => {
      this.playerService.activePlaylist();
      this.playerService.epoch();
      this.timeSync.synced();
      this.loadFromClock();
    });

    // Sync playback state for status overlay
    effect(() => {
      this.playbackState.setCurrentIndex(this._currentIndex());
      this.playbackState.setTotalItems(this.items().length);
    });
  }

  ngOnInit(): void {
    this.playerService.connect().catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearAdvanceTimer();
    this.clearTransitionTimer();
    this.playerService.disconnect();
  }

  // ── Layer event handlers ──

  onLayerImageLoaded(layer: LayerId): void {
    if (this._initialLoad() && layer === this._activeLayer()) {
      this.playInitialAppearance();
    } else if (
      this._pendingTransition &&
      this._isPendingImageLoad &&
      layer !== this._activeLayer()
    ) {
      this._isPendingImageLoad = false;
      const transition = this._pendingTransition;
      this._pendingTransition = null;
      this.executeTransition(transition);
    }
  }

  onLayerVideoReady(layer: LayerId): void {
    const videoEl =
      layer === 0 ? this.layer0Video()?.nativeElement : this.layer1Video()?.nativeElement;
    if (videoEl) {
      videoEl.muted = true;
      // Late joiner: seek into the video so it lines up with the group timeline.
      if (this._initialLoad() && layer === this._activeLayer() && this._pendingSeekOffsetMs > 0) {
        videoEl.currentTime = this._pendingSeekOffsetMs / 1000;
      }
      videoEl.play().catch((err: Error) => {
        console.warn(`[Playback] layer ${layer} play() rejected:`, err.message);
      });
    }
    if (this._initialLoad() && layer === this._activeLayer()) {
      this.playInitialAppearance();
    }
  }

  // Note: video advancing is driven by the deterministic boundary timer
  // (scheduleAdvance), not the native `ended` event, so every group member
  // switches at the same instant even if real video lengths differ slightly.

  onMediaError(event?: Event): void {
    const target = event?.target as HTMLVideoElement | HTMLImageElement | null;
    const src = target?.getAttribute('src') ?? 'unknown';
    const error = (target as HTMLVideoElement)?.error;
    console.error(
      `[Playback] Media error for ${src}`,
      error ? `code=${error.code} message=${error.message}` : 'no details',
    );
    // Skip broken items — advance after a short delay
    setTimeout(() => {
      if (!this.destroyed) this.advance();
    }, 1000);
  }

  // ── Unmute ──

  unmute(): void {
    this._isMuted.set(false);
    const videoEl =
      this._activeLayer() === 0
        ? this.layer0Video()?.nativeElement
        : this.layer1Video()?.nativeElement;
    if (videoEl) {
      videoEl.muted = false;
    }
  }

  // ── Media URL ──

  private buildMediaUrl(url: string): string {
    const serverUrl = this.connectionService.serverUrl();
    const apiKey = this.connectionService.apiKey();
    const separator = url.includes('?') ? '&' : '?';
    return `${serverUrl}${url}${separator}token=${apiKey}`;
  }

  // ── Deterministic clock anchoring ──

  /**
   * Reset the layers to the item the shared clock says should be on screen now.
   * Used on playlist/epoch change and on the first successful clock sync. Reads
   * the clock untracked so this stays free of the periodic-resync offset signal.
   */
  private loadFromClock(): void {
    this.clearAdvanceTimer();
    this.clearTransitionTimer();
    this._activeLayer.set(0);
    this._layer1Item.set(null);
    this._layer0Anim.set('');
    this._layer1Anim.set('');
    this._isTransitioning.set(false);
    this._initialLoad.set(true);
    this._pendingTransition = null;
    this._isPendingImageLoad = false;

    const items = this.items();
    if (items.length === 0) {
      this._currentIndex.set(0);
      this._pendingSeekOffsetMs = 0;
      this._layer0Item.set(null);
      return;
    }

    const epoch = this.playerService.epoch();
    const pos = untracked(() => computePosition(items, epoch, this.timeSync.serverNow()));
    this._currentIndex.set(pos.index);
    this._pendingSeekOffsetMs = items[pos.index]?.type === 'video' ? pos.offsetMs : 0;
    this._layer0Item.set(items[pos.index] ?? null);
  }

  // ── Playback scheduling ──

  /**
   * Schedule the next transition at the deterministic boundary derived from the
   * shared epoch and synchronized clock (for both images and videos), so all
   * group members switch together regardless of when each one started.
   */
  private scheduleAdvance(): void {
    this.clearAdvanceTimer();
    const items = this.items();
    if (items.length === 0) return;

    const pos = computePosition(items, this.playerService.epoch(), this.timeSync.serverNow());
    if (!Number.isFinite(pos.nextBoundaryAtMs)) return;

    const delay = Math.max(0, pos.nextBoundaryAtMs - this.timeSync.serverNow());
    this.advanceTimer = setTimeout(() => {
      this.zone.run(() => this.advance());
    }, delay);
  }

  // ── Transitions ──

  private playInitialAppearance(): void {
    if (!this._initialLoad()) return;
    this._initialLoad.set(false);
    this._pendingSeekOffsetMs = 0;

    const item = this.currentItem();
    const { type, duration } = resolveTransition(item);
    const layer = this._activeLayer();

    if (type === 'cut') {
      this.scheduleAdvance();
      return;
    }

    this.setLayerAnim(layer, enterAnim(type, duration));
    this.transitionTimer = setTimeout(() => {
      this.zone.run(() => {
        this.setLayerAnim(layer, '');
        this.scheduleAdvance();
      });
    }, duration);
  }

  private advance(): void {
    if (this.destroyed || this._isTransitioning() || this._isPendingImageLoad) return;

    const list = this.items();
    if (list.length === 0) return;

    const prevIndex = this._currentIndex();

    // Self-heal: if the clock has moved well beyond the next item (e.g. a
    // throttled background tab missed several boundaries), hard re-anchor to the
    // clock instead of stepping by one and lagging the rest of the group.
    if (list.length > 1) {
      const pos = computePosition(list, this.playerService.epoch(), this.timeSync.serverNow());
      const expected = (prevIndex + 1) % list.length;
      if (pos.index !== prevIndex && pos.index !== expected) {
        this.loadFromClock();
        return;
      }
    }

    const nextIndex = (prevIndex + 1) % list.length;
    const isWrapping = nextIndex === prevIndex;
    const nextItem = list[nextIndex];
    const transition = resolveTransition(nextItem);

    if (isWrapping) {
      this.advanceWrapping(nextItem, transition);
      return;
    }

    // Update playlist position
    this._currentIndex.set(nextIndex);

    // Load next item onto the inactive layer
    const inactiveLayer: LayerId = this._activeLayer() === 0 ? 1 : 0;
    this.setLayerItem(inactiveLayer, nextItem);

    if (transition.type === 'cut') {
      // Instant swap — no animation
      const oldLayer = this._activeLayer();
      this._activeLayer.set(inactiveLayer);
      this.setLayerItem(oldLayer, null);
      this.onTransitionComplete(nextItem);
      return;
    }

    if (nextItem.type === 'image') {
      // Wait for image to load before starting animation
      this._isPendingImageLoad = true;
      this._pendingTransition = transition;
    } else {
      // Video — start transition immediately
      this.executeTransition(transition);
    }
  }

  private executeTransition(transition: TransitionSpec): void {
    const activeLayer = this._activeLayer();
    const inactiveLayer: LayerId = activeLayer === 0 ? 1 : 0;

    this._isTransitioning.set(true);

    // Apply exit animation to outgoing layer, enter animation to incoming layer
    this.setLayerAnim(activeLayer, exitAnim(transition.type, transition.duration));
    this.setLayerAnim(inactiveLayer, enterAnim(transition.type, transition.duration));

    this.transitionTimer = setTimeout(() => {
      this.zone.run(() => {
        this._isTransitioning.set(false);
        this._activeLayer.set(inactiveLayer);
        this.setLayerAnim(0, '');
        this.setLayerAnim(1, '');
        this.setLayerItem(activeLayer, null); // clean up old layer

        const item = inactiveLayer === 0 ? this._layer0Item() : this._layer1Item();
        this.onTransitionComplete(item);
      });
    }, transition.duration);
  }

  private advanceWrapping(item: PlaylistItem, transition: TransitionSpec): void {
    const layer = this._activeLayer();

    if (transition.type === 'cut') {
      // Instant restart — no animation
      this.restartCurrentItem(item);
      this.scheduleAdvance();
      return;
    }

    this._isTransitioning.set(true);

    // Exit animation on current layer
    this.setLayerAnim(layer, exitAnim(transition.type, transition.duration));

    this.transitionTimer = setTimeout(() => {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.restartCurrentItem(item);

        // Enter animation on same layer
        this.setLayerAnim(layer, enterAnim(transition.type, transition.duration));

        this.transitionTimer = setTimeout(() => {
          if (this.destroyed) return;
          this.zone.run(() => {
            this._isTransitioning.set(false);
            this.setLayerAnim(layer, '');
            this.scheduleAdvance();
          });
        }, transition.duration);
      });
    }, transition.duration);
  }

  private restartCurrentItem(item: PlaylistItem): void {
    if (item.type === 'video') {
      const videoEl =
        this._activeLayer() === 0
          ? this.layer0Video()?.nativeElement
          : this.layer1Video()?.nativeElement;
      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => undefined);
      }
      this._isMuted.set(true);
    }
  }

  private onTransitionComplete(item: PlaylistItem | null): void {
    if (!item) return;
    if (item.type === 'video') this._isMuted.set(true);
    this.scheduleAdvance();
  }

  // ── Helpers ──

  private setLayerItem(layer: LayerId, item: PlaylistItem | null): void {
    if (layer === 0) this._layer0Item.set(item);
    else this._layer1Item.set(item);
  }

  private setLayerAnim(layer: LayerId, anim: string): void {
    if (layer === 0) this._layer0Anim.set(anim);
    else this._layer1Anim.set(anim);
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer !== null) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }
}
