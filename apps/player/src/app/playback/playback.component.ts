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
  ChangeDetectionStrategy,
} from '@angular/core';
import { PlayerService } from '../player/player.service';
import { TimeSyncService } from '../player/time-sync.service';
import { ConnectionService } from '../connection/connection.service';
import { PlaylistItem } from '../player/player.models';
import { PlaybackStateService } from './playback-state.service';
import { StatusOverlayComponent } from './status-overlay.component';
import { LiveStreamViewComponent } from './live-stream-view.component';
import {
  resolveTransition,
  enterAnim,
  exitAnim,
  crossDissolves,
  TransitionSpec,
} from './playback-transitions';
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
        <app-live-stream-view [streamId]="liveStreamId()" [showUnmute]="showUnmute()" />
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
              (error)="onMediaError($event, 0)"
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
              (error)="onMediaError($event, 0)"
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
              (error)="onMediaError($event, 1)"
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
              (error)="onMediaError($event, 1)"
            ></video>
          }
        </div>

        @if (isMuted() && showUnmute() && currentItem()?.type === 'video') {
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
  changeDetection: ChangeDetectionStrategy.Eager,
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

      /* Fade — a cross-dissolve: only the incoming layer animates, the
         outgoing one stays opaque underneath it. See playback-transitions.ts
         for why ramping both at once dips through black. */
      @keyframes fade-enter {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
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

      /* Zoom In — the incoming picture grows into place as it dissolves in.
         The scale used to sit on the outgoing layer, which the incoming one
         covers completely, so zoom-in was indistinguishable from a plain fade. */
      @keyframes zoom-in-enter {
        from {
          opacity: 0;
          transform: scale(0.85);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Zoom Out — the incoming picture shrinks into place as it dissolves in. */
      @keyframes zoom-out-enter {
        from {
          opacity: 0;
          transform: scale(1.15);
        }
        to {
          opacity: 1;
          transform: scale(1);
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
  private pendingLoadWatchdog: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private _pendingTransition: TransitionSpec | null = null;
  private _isPendingImageLoad = false;
  /** Offset (ms) to seek the active video to on first appearance after a clock re-anchor. */
  private _pendingSeekOffsetMs = 0;
  private lastAnchorSignature: string | null = null;
  /**
   * Bumped on every re-anchor. Deferred callbacks capture it and bail once it
   * has moved on, so a timer armed before a re-anchor can no longer write
   * animation state into the run that replaced it.
   */
  private anchorGeneration = 0;
  private lastAppliedOffsetMs = 0;

  /** Clock corrections below this are sampling jitter, not worth re-arming for. */
  private static readonly OFFSET_REARM_THRESHOLD_MS = 100;
  /** Retry delay when a boundary lands while the previous switch is still settling. */
  private static readonly BOUNDARY_RETRY_MS = 250;
  /** Floor for how long to wait on an incoming image before giving up on its load. */
  private static readonly PENDING_LOAD_TIMEOUT_MS = 3000;

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
  readonly showUnmute = computed(() => this.playerService.showUnmuteButton());

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
      const signature = this.anchorSignature();
      if (signature === this.lastAnchorSignature) return;
      this.lastAnchorSignature = signature;
      this.loadFromClock();
    });

    // A re-sync moves the clock, and with it every boundary derived from it. An
    // already-armed timer still holds a delay computed against the old offset,
    // so it has to be recomputed — otherwise the correction only lands one item
    // later, which is exactly when a group member drifts out of step.
    effect(() => {
      const offset = this.timeSync.offsetMs();
      const delta = offset - this.lastAppliedOffsetMs;
      this.lastAppliedOffsetMs = offset;
      if (Math.abs(delta) < PlaybackComponent.OFFSET_REARM_THRESHOLD_MS) return;
      untracked(() => this.applyClockCorrection());
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
    this.clearPendingLoadWatchdog();
    this.playerService.disconnect();
  }

  // ── Layer event handlers ──

  onLayerImageLoaded(layer: LayerId): void {
    if (this._initialLoad() && layer === this._activeLayer()) {
      this.playEnterAnimation();
    } else if (
      this._pendingTransition &&
      this._isPendingImageLoad &&
      layer !== this._activeLayer()
    ) {
      const transition = this._pendingTransition;
      this.clearPendingLoad();
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
      this.playEnterAnimation();
    }
  }

  // Note: video advancing is driven by the deterministic boundary timer
  // (scheduleAdvance), not the native `ended` event, so every group member
  // switches at the same instant even if real video lengths differ slightly.

  onMediaError(event: Event | undefined, layer: LayerId): void {
    const target = event?.target as HTMLVideoElement | HTMLImageElement | null;
    const error = (target as HTMLVideoElement)?.error;
    // The URL is deliberately not logged: it carries the signed grant, and this
    // line used to print the screen's API key to the console verbatim.
    console.error(
      '[Playback] Media error',
      error ? `code=${error.code} message=${error.message}` : 'no details',
    );
    // A media URL can fail because its grant has aged out — the state carries
    // fresh ones, so refetch rather than skipping items one by one until the
    // whole playlist has been walked off.
    void this.playerService.fetchState().catch(() => undefined);

    // Release whatever this layer was holding. No `load` follows an `error`, and
    // a stuck `_isPendingImageLoad` makes every later boundary early-return — a
    // single broken media URL used to stall the screen for good.
    if (layer !== this._activeLayer()) {
      this.clearPendingLoad();
    } else if (this._initialLoad()) {
      this._initialLoad.set(false);
    }

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

  /**
   * The server hands out media URLs that already carry their own signed grant,
   * so nothing is appended here. Appending the API key — as this used to do —
   * put a long-lived credential into the DOM, the Referer chain and every
   * access log, for every frame the screen ever showed.
   */
  private buildMediaUrl(url: string): string {
    return `${this.connectionService.serverUrl()}${url}`;
  }

  // ── Deterministic clock anchoring ──

  /**
   * Reset the layers to the item the shared clock says should be on screen now.
   * Used on playlist/epoch change and on the first successful clock sync. Reads
   * the clock untracked so this stays free of the periodic-resync offset signal.
   */
  private loadFromClock(): void {
    this.anchorGeneration++;
    this.clearAdvanceTimer();
    this.clearTransitionTimer();
    this.clearPendingLoad();
    this._activeLayer.set(0);
    this._layer1Item.set(null);
    this._layer0Anim.set('');
    this._layer1Anim.set('');
    this._isTransitioning.set(false);
    this._initialLoad.set(true);

    const items = this.items();
    if (items.length === 0) {
      this._currentIndex.set(0);
      this._pendingSeekOffsetMs = 0;
      this._layer0Item.set(null);
      return;
    }

    const epoch = this.playerService.epoch();
    const pos = untracked(() => computePosition(items, epoch, this.timeSync.serverNow()));
    const nextItem = items[pos.index] ?? null;

    // A re-anchor that lands on the item already on screen writes back the very
    // same object reference. `signal.set` compares with `Object.is`, so nothing
    // notifies, the <img> is not re-created and no `load` event will ever
    // arrive — which is why the appearance has to be settled here rather than
    // waiting for a DOM event that is not coming.
    const unchanged = nextItem !== null && untracked(this._layer0Item) === nextItem;

    this._currentIndex.set(pos.index);
    this._pendingSeekOffsetMs = nextItem?.type === 'video' && !unchanged ? pos.offsetMs : 0;
    this._layer0Item.set(nextItem);
    if (unchanged) this._initialLoad.set(false);

    // Timing comes from the shared clock, never from when media happened to
    // decode. Arming here is what keeps the screen on the group's grid even if
    // the media event never fires.
    untracked(() => this.scheduleAdvance());
  }

  /**
   * Apply a clock correction to the running schedule. A correction that lands in
   * a different item needs a full re-anchor; anything smaller only moves the
   * boundary, so re-arming the timer is enough and nothing on screen changes.
   */
  private applyClockCorrection(): void {
    // Never start playback from here — only adjust a schedule already running.
    if (this.advanceTimer === null) return;
    const items = this.items();
    if (items.length === 0) return;

    const pos = computePosition(items, this.playerService.epoch(), this.timeSync.serverNow());
    if (pos.index !== this._currentIndex()) this.loadFromClock();
    else this.scheduleAdvance();
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

  /**
   * Enter animation for a freshly anchored item. Cosmetic only — the boundary
   * timer is armed by {@link loadFromClock} from the shared clock, so a slow
   * decode or a media event that never arrives can no longer stop playback.
   */
  private playEnterAnimation(): void {
    if (!this._initialLoad()) return;
    this._initialLoad.set(false);
    this._pendingSeekOffsetMs = 0;

    const { type, duration } = resolveTransition(this.currentItem());
    if (type === 'cut') return;

    const layer = this._activeLayer();
    this.setLayerAnim(layer, enterAnim(type, duration));
    this.armTransitionTimer(() => this.setLayerAnim(layer, ''), duration);
  }

  private advance(): void {
    if (this.destroyed) return;

    // The boundary landed while the previous switch was still settling. Dropping
    // it lost the switch with nothing left to re-arm it, so retry shortly. A
    // fixed delay rather than scheduleAdvance(): the boundary is already in the
    // past, so recomputing it yields 0 and spins for the whole transition.
    if (this._isTransitioning() || this._isPendingImageLoad) {
      this.clearAdvanceTimer();
      this.advanceTimer = setTimeout(
        () => this.zone.run(() => this.advance()),
        PlaybackComponent.BOUNDARY_RETRY_MS,
      );
      return;
    }

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

    if (nextItem.type === 'image') {
      // Wait for the image to decode before swapping or animating — cut included.
      // Cut used to swap straight away, onto a layer whose <img> had not loaded
      // yet, so the black container showed through until the decode finished. On
      // a TV that gap is long enough to read as a blend rather than a cut.
      this._isPendingImageLoad = true;
      this._pendingTransition = transition;
      this.armPendingLoadWatchdog(transition);
    } else {
      // Video — start immediately
      this.executeTransition(transition);
    }
  }

  /**
   * Identity of everything that forces playback to re-anchor to the shared
   * clock: the playlist, its timeline and the group epoch, plus the one-shot
   * first clock sync. Per-item transition settings are deliberately excluded —
   * every state push replaces the playlist object, and re-anchoring on that
   * restarted playback and replayed an enter animation for edits that do not
   * move a single boundary.
   */
  private anchorSignature(): string {
    const playlist = this.playerService.activePlaylist();
    const epoch = this.playerService.epoch();
    const synced = this.timeSync.synced();
    const timeline = (playlist?.items ?? [])
      .map((item) => `${item.type}:${item.duration}:${item.url}`)
      .join('|');
    return `${playlist?.id ?? ''}#${epoch}#${synced}#${timeline}`;
  }

  private executeTransition(transition: TransitionSpec): void {
    const activeLayer = this._activeLayer();
    const inactiveLayer: LayerId = activeLayer === 0 ? 1 : 0;

    if (transition.type === 'cut') {
      this.commitLayerSwap(activeLayer, inactiveLayer);
      return;
    }

    this._isTransitioning.set(true);

    // Enter animation on the incoming layer. The outgoing one only animates for
    // transitions that move it off screen; a cross-dissolve leaves it opaque
    // underneath, so `exitAnim` hands back an empty string.
    this.setLayerAnim(activeLayer, exitAnim(transition.type, transition.duration));
    this.setLayerAnim(inactiveLayer, enterAnim(transition.type, transition.duration));

    this.armTransitionTimer(() => {
      this._isTransitioning.set(false);
      this.setLayerAnim(0, '');
      this.setLayerAnim(1, '');
      this.commitLayerSwap(activeLayer, inactiveLayer);
    }, transition.duration);
  }

  /** Make the incoming layer current and release the outgoing one. */
  private commitLayerSwap(outgoing: LayerId, incoming: LayerId): void {
    this._activeLayer.set(incoming);
    this.setLayerItem(outgoing, null);
    this.onTransitionComplete(incoming === 0 ? this._layer0Item() : this._layer1Item());
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

    // A one-item playlist has no second layer to dissolve against, so a
    // cross-dissolve restarts and plays its enter half only. Running exit and
    // enter back to back took twice the configured duration and showed up as
    // two separate blends.
    if (crossDissolves(transition.type)) {
      this.restartCurrentItem(item);
      this.setLayerAnim(layer, enterAnim(transition.type, transition.duration));
      this.armTransitionTimer(() => this.finishWrap(layer), transition.duration);
      return;
    }

    // Exit animation on current layer
    this.setLayerAnim(layer, exitAnim(transition.type, transition.duration));

    this.armTransitionTimer(() => {
      this.restartCurrentItem(item);

      // Enter animation on same layer
      this.setLayerAnim(layer, enterAnim(transition.type, transition.duration));

      this.armTransitionTimer(() => this.finishWrap(layer), transition.duration);
    }, transition.duration);
  }

  private finishWrap(layer: LayerId): void {
    this._isTransitioning.set(false);
    this.setLayerAnim(layer, '');
    this.scheduleAdvance();
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

  /**
   * Arm the transition timer, replacing whatever was pending. The captured
   * generation makes the callback a no-op once a re-anchor has happened, so a
   * stale callback can no longer wipe the animation of the run that replaced it.
   */
  private armTransitionTimer(run: () => void, delayMs: number): void {
    this.clearTransitionTimer();
    const generation = this.anchorGeneration;
    this.transitionTimer = setTimeout(() => {
      if (this.destroyed || generation !== this.anchorGeneration) return;
      this.zone.run(run);
    }, delayMs);
  }

  /**
   * Give up on an incoming image whose `load` never arrives. A hung request
   * fires neither `load` nor `error`, and the pending gate would otherwise make
   * every later boundary early-return for good.
   */
  private armPendingLoadWatchdog(transition: TransitionSpec): void {
    this.clearPendingLoadWatchdog();
    const generation = this.anchorGeneration;
    const delay = Math.max(2 * transition.duration, PlaybackComponent.PENDING_LOAD_TIMEOUT_MS);
    this.pendingLoadWatchdog = setTimeout(() => {
      this.zone.run(() => {
        if (this.destroyed || generation !== this.anchorGeneration) return;
        if (!this._isPendingImageLoad) return;
        this.clearPendingLoad();
        this.executeTransition(transition);
      });
    }, delay);
  }

  private clearPendingLoad(): void {
    this.clearPendingLoadWatchdog();
    this._isPendingImageLoad = false;
    this._pendingTransition = null;
  }

  private clearPendingLoadWatchdog(): void {
    if (this.pendingLoadWatchdog !== null) {
      clearTimeout(this.pendingLoadWatchdog);
      this.pendingLoadWatchdog = null;
    }
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }
}
