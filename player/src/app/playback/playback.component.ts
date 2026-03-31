import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  effect,
  NgZone,
} from '@angular/core';
import { PlayerService } from '../player/player.service';
import { ConnectionService } from '../connection/connection.service';
import { PlaylistItem } from '../player/player.models';
import { PlaybackStateService } from './playback-state.service';
import { HlsService } from './hls.service';
import { StatusOverlayComponent } from './status-overlay.component';

type LayerId = 0 | 1;

const KNOWN_TRANSITIONS = new Set([
  'cut',
  'fade',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out',
]);

function resolveTransition(item: PlaylistItem | null): {
  type: string;
  duration: number;
} {
  if (!item || !KNOWN_TRANSITIONS.has(item.transition)) {
    return { type: 'fade', duration: 500 };
  }
  return { type: item.transition, duration: item.transitionDurationMs ?? 500 };
}

@Component({
  selector: 'app-playback',
  imports: [StatusOverlayComponent],
  template: `
    <div class="playback-container">
      @if (isLiveStreaming()) {
        <div class="content-layer layer-active">
          @if (hlsError()) {
            <div class="no-content">
              <p class="text-red-400 text-lg">Live stream unavailable</p>
            </div>
          } @else {
            <video
              #hlsVideo
              class="content-media"
              autoplay
              muted
              playsinline
            ></video>
          }
        </div>

        @if (isMuted()) {
          <button
            class="unmute-overlay"
            (click)="unmuteHls()"
            (keydown.enter)="unmuteHls()"
          >
            <span class="unmute-icon">🔇</span>
            <span class="text-sm">Click to unmute</span>
          </button>
        }
      } @else if (isPending()) {
        <div class="no-content">
          <p class="text-text-muted text-lg">Preparing content…</p>
        </div>
      } @else if (isSplitGroupPlay()) {
        <div
          class="content-layer"
          [class.content-visible]="showCurrent()"
          [class.content-hidden]="!showCurrent()"
        >
          @if (groupPlayContentType() === 'video') {
            <video
              [src]="groupPlayMediaUrl()"
              class="content-media"
              autoplay
              muted
              playsinline
              (ended)="onGroupPlayVideoEnded()"
              (error)="onMediaError()"
            ></video>
          } @else {
            <img
              [src]="groupPlayMediaUrl()"
              class="content-media"
              alt=""
              (load)="onGroupPlayImageLoaded()"
              (error)="onMediaError()"
            />
          }
        </div>
      } @else if (noContent()) {
        <div class="no-content">
          <p class="text-text-muted text-lg">No content scheduled</p>
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
              (error)="onMediaError()"
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
              (ended)="onLayerVideoEnded(0)"
              (error)="onMediaError()"
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
              (error)="onMediaError()"
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
              (ended)="onLayerVideoEnded(1)"
              (error)="onMediaError()"
            ></video>
          }
        </div>

        @if (isMuted() && currentItem()?.type === 'video') {
          <button
            class="unmute-overlay"
            (click)="unmute()"
            (keydown.enter)="unmute()"
          >
            <span class="unmute-icon">🔇</span>
            <span class="text-sm">Click to unmute</span>
          </button>
        }
      }

      <app-status-overlay />

      <!-- Preload next image (hidden) -->
      @if (nextMediaUrl()) {
        <img
          [src]="nextMediaUrl()"
          class="preload-image"
          alt=""
          aria-hidden="true"
        />
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

      /* Group play uses the old show/hide approach */
      .content-visible {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }

      .content-hidden {
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
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
  private readonly connectionService = inject(ConnectionService);
  private readonly playbackState = inject(PlaybackStateService);
  private readonly hlsService = inject(HlsService);
  private readonly zone = inject(NgZone);

  private readonly layer0Video =
    viewChild<ElementRef<HTMLVideoElement>>('layer0Video');
  private readonly layer1Video =
    viewChild<ElementRef<HTMLVideoElement>>('layer1Video');
  private readonly hlsVideo =
    viewChild<ElementRef<HTMLVideoElement>>('hlsVideo');

  private readonly _currentIndex = signal(0);
  private readonly _activeLayer = signal<LayerId>(0);
  private readonly _layer0Item = signal<PlaylistItem | null>(null);
  private readonly _layer1Item = signal<PlaylistItem | null>(null);
  private readonly _layer0Anim = signal('');
  private readonly _layer1Anim = signal('');
  private readonly _isTransitioning = signal(false);
  private readonly _initialLoad = signal(true);
  private readonly _showCurrent = signal(true); // kept for group play mode
  private readonly _isMuted = signal(true);
  private readonly _hlsError = signal(false);
  private readonly _groupPlayContentUrl = signal<string | null>(null);
  private readonly _groupPlayContentType = signal<string>('image');
  private readonly _isPending = signal(false);

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private hlsFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private currentHlsStreamId: string | null = null;
  private _pendingTransition: { type: string; duration: number } | null = null;
  private _isPendingImageLoad = false;

  readonly showCurrent = this._showCurrent.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly hlsError = this._hlsError.asReadonly();
  readonly groupPlayContentUrl = this._groupPlayContentUrl.asReadonly();
  readonly groupPlayContentType = this._groupPlayContentType.asReadonly();
  readonly isPending = this._isPending.asReadonly();
  readonly activeLayer = this._activeLayer.asReadonly();
  readonly isTransitioning = this._isTransitioning.asReadonly();
  readonly layer0Item = this._layer0Item.asReadonly();
  readonly layer1Item = this._layer1Item.asReadonly();
  readonly layer0Anim = this._layer0Anim.asReadonly();
  readonly layer1Anim = this._layer1Anim.asReadonly();

  readonly isLiveStreaming = computed(() => this.playerService.isLiveStreaming());
  readonly isSplitGroupPlay = computed(
    () => this._groupPlayContentUrl() !== null,
  );

  readonly groupPlayMediaUrl = computed(() => {
    const url = this._groupPlayContentUrl();
    if (!url) return '';
    return this.buildMediaUrl(url);
  });

  readonly items = computed(() => {
    const playlist = this.playerService.activePlaylist();
    return playlist?.items ?? [];
  });

  readonly noContent = computed(() => this.items().length === 0);

  readonly currentItem = computed((): PlaylistItem | null => {
    return this._activeLayer() === 0
      ? this._layer0Item()
      : this._layer1Item();
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
    const onTop = this._isTransitioning()
      ? this._activeLayer() !== 1
      : this._activeLayer() === 1;
    return onTop ? 2 : 1;
  });

  constructor() {
    // React to playlist changes — reset playback
    effect(() => {
      const playlist = this.playerService.activePlaylist();
      if (playlist) {
        this._currentIndex.set(0);
        this._activeLayer.set(0);
        this._layer1Item.set(null);
        this._layer0Anim.set('');
        this._layer1Anim.set('');
        this._isTransitioning.set(false);
        this._initialLoad.set(true);
        this._pendingTransition = null;
        this._isPendingImageLoad = false;
        this.clearAdvanceTimer();
        this.clearTransitionTimer();

        const firstItem = playlist.items?.[0] ?? null;
        this._layer0Item.set(firstItem);
      }
    });

    // Sync playback state for status overlay
    effect(() => {
      this.playbackState.setCurrentIndex(this._currentIndex());
      this.playbackState.setTotalItems(this.items().length);
    });

    // React to live stream changes — attach/detach HLS
    effect(() => {
      const liveStream = this.playerService.activeLiveStream();
      if (liveStream && liveStream.id) {
        this.startHls(liveStream.id);
      } else {
        this.stopHls();
      }
    });

    // React to group_play events — display sliced content in split mode
    effect(() => {
      const event = this.playerService.groupPlayEvent();
      if (event && this.playerService.isSplitMode()) {
        this._isPending.set(false);
        this._groupPlayContentUrl.set(event.contentUrl);
        this._groupPlayContentType.set(
          this.inferContentType(event.contentUrl),
        );
        this._showCurrent.set(true);
      }
    });

    // React to pending events — show "preparing content" in split mode
    effect(() => {
      const event = this.playerService.pendingEvent();
      if (event && this.playerService.isSplitMode()) {
        this._isPending.set(true);
      }
    });
  }

  ngOnInit(): void {
    this.playerService.connect().catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearAdvanceTimer();
    this.clearTransitionTimer();
    this.clearHlsFallbackTimer();
    this.hlsService.destroy();
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
    if (this._initialLoad() && layer === this._activeLayer()) {
      this.playInitialAppearance();
    }
  }

  onLayerVideoEnded(layer: LayerId): void {
    if (layer === this._activeLayer() && !this._isTransitioning()) {
      this.advance();
    }
  }

  onMediaError(): void {
    // Skip broken items — advance after a short delay
    setTimeout(() => {
      if (!this.destroyed) this.advance();
    }, 1000);
  }

  // ── Group play handlers (unchanged) ──

  onGroupPlayImageLoaded(): void {
    this._showCurrent.set(true);
  }

  onGroupPlayVideoEnded(): void {
    // In split mode group_play, content stays until the next group_play event
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

  unmuteHls(): void {
    this._isMuted.set(false);
    const videoEl = this.hlsVideo()?.nativeElement;
    if (videoEl) {
      videoEl.muted = false;
    }
  }

  // ── HLS (unchanged) ──

  private startHls(streamId: string): void {
    if (this.currentHlsStreamId === streamId) return;
    this.currentHlsStreamId = streamId;
    this._hlsError.set(false);
    this._isMuted.set(true);
    this.clearHlsFallbackTimer();

    // Wait for the template to render the video element
    setTimeout(() => {
      if (this.destroyed) return;
      const videoEl = this.hlsVideo()?.nativeElement;
      if (videoEl) {
        this.hlsService.attach(videoEl, streamId);
        this.monitorHlsHealth();
      } else {
        this._hlsError.set(true);
      }
    }, 0);
  }

  private stopHls(): void {
    this.currentHlsStreamId = null;
    this.clearHlsFallbackTimer();
    this.hlsService.destroy();
    this._hlsError.set(false);
  }

  private monitorHlsHealth(): void {
    this.clearHlsFallbackTimer();

    // If stream health becomes 'stopped', show error after a short grace period
    const checkHealth = () => {
      if (this.destroyed || !this.isLiveStreaming()) return;
      const health = this.playbackState.streamHealth();
      if (health === 'stopped') {
        this.zone.run(() => {
          this._hlsError.set(true);
          this.hlsService.destroy();
        });
      } else {
        this.hlsFallbackTimer = setTimeout(checkHealth, 2000);
      }
    };

    this.hlsFallbackTimer = setTimeout(checkHealth, 2000);
  }

  private clearHlsFallbackTimer(): void {
    if (this.hlsFallbackTimer !== null) {
      clearTimeout(this.hlsFallbackTimer);
      this.hlsFallbackTimer = null;
    }
  }

  // ── Media URL ──

  private buildMediaUrl(url: string): string {
    const serverUrl = this.connectionService.serverUrl();
    const apiKey = this.connectionService.apiKey();
    const separator = url.includes('?') ? '&' : '?';
    return `${serverUrl}${url}${separator}token=${apiKey}`;
  }

  // ── Playback scheduling ──

  private scheduleAdvance(): void {
    this.clearAdvanceTimer();
    const item = this.currentItem();
    if (!item || item.type === 'video') return;

    const durationMs = (item.duration || 10) * 1000;
    this.advanceTimer = setTimeout(() => {
      this.zone.run(() => this.advance());
    }, durationMs);
  }

  // ── Transitions ──

  private playInitialAppearance(): void {
    if (!this._initialLoad()) return;
    this._initialLoad.set(false);

    const item = this.currentItem();
    const { type, duration } = resolveTransition(item);
    const layer = this._activeLayer();

    if (type === 'cut') {
      this.scheduleAdvance();
      return;
    }

    this.setLayerAnim(
      layer,
      `${type}-enter ${duration}ms ease-in-out both`,
    );
    this.transitionTimer = setTimeout(() => {
      this.zone.run(() => {
        this.setLayerAnim(layer, '');
        this.scheduleAdvance();
      });
    }, duration);
  }

  private advance(): void {
    if (this.destroyed || this._isTransitioning() || this._isPendingImageLoad)
      return;

    const list = this.items();
    if (list.length === 0) return;

    const prevIndex = this._currentIndex();
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

  private executeTransition(transition: {
    type: string;
    duration: number;
  }): void {
    const activeLayer = this._activeLayer();
    const inactiveLayer: LayerId = activeLayer === 0 ? 1 : 0;

    this._isTransitioning.set(true);

    // Apply exit animation to outgoing layer, enter animation to incoming layer
    this.setLayerAnim(
      activeLayer,
      `${transition.type}-exit ${transition.duration}ms ease-in-out both`,
    );
    this.setLayerAnim(
      inactiveLayer,
      `${transition.type}-enter ${transition.duration}ms ease-in-out both`,
    );

    this.transitionTimer = setTimeout(() => {
      this.zone.run(() => {
        this._isTransitioning.set(false);
        this._activeLayer.set(inactiveLayer);
        this.setLayerAnim(0, '');
        this.setLayerAnim(1, '');
        this.setLayerItem(activeLayer, null); // clean up old layer

        const item =
          inactiveLayer === 0 ? this._layer0Item() : this._layer1Item();
        this.onTransitionComplete(item);
      });
    }, transition.duration);
  }

  private advanceWrapping(
    item: PlaylistItem,
    transition: { type: string; duration: number },
  ): void {
    const layer = this._activeLayer();

    if (transition.type === 'cut') {
      // Instant restart — no animation
      this.restartCurrentItem(item);
      this.scheduleAdvance();
      return;
    }

    this._isTransitioning.set(true);

    // Exit animation on current layer
    this.setLayerAnim(
      layer,
      `${transition.type}-exit ${transition.duration}ms ease-in-out both`,
    );

    this.transitionTimer = setTimeout(() => {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.restartCurrentItem(item);

        // Enter animation on same layer
        this.setLayerAnim(
          layer,
          `${transition.type}-enter ${transition.duration}ms ease-in-out both`,
        );

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

  private inferContentType(url: string): string {
    const lower = url.toLowerCase();
    if (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov')
    ) {
      return 'video';
    }
    return 'image';
  }
}
