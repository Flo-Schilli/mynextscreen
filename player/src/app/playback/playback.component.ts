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

@Component({
  selector: 'app-playback',
  imports: [StatusOverlayComponent],
  template: `
    <div class="playback-container">
      @if (isLiveStreaming()) {
        <div class="content-layer content-visible">
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
        <div
          class="content-layer"
          [class.content-visible]="showCurrent()"
          [class.content-hidden]="!showCurrent()"
        >
          @if (currentItem()?.type === 'image') {
            <img
              #currentImage
              [src]="currentMediaUrl()"
              class="content-media"
              alt=""
              (load)="onImageLoaded()"
              (error)="onMediaError()"
            />
          } @else if (currentItem()?.type === 'video') {
            <video
              #currentVideo
              [src]="currentMediaUrl()"
              class="content-media"
              autoplay
              muted
              playsinline
              (ended)="onVideoEnded()"
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
        transition: opacity 0.3s ease-in-out;
      }

      .content-visible {
        opacity: 1;
      }

      .content-hidden {
        opacity: 0;
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
    `,
  ],
})
export class PlaybackComponent implements OnInit, OnDestroy {
  private readonly playerService = inject(PlayerService);
  private readonly connectionService = inject(ConnectionService);
  private readonly playbackState = inject(PlaybackStateService);
  private readonly hlsService = inject(HlsService);
  private readonly zone = inject(NgZone);

  private readonly currentVideo = viewChild<ElementRef<HTMLVideoElement>>('currentVideo');
  private readonly hlsVideo = viewChild<ElementRef<HTMLVideoElement>>('hlsVideo');

  private readonly _currentIndex = signal(0);
  private readonly _showCurrent = signal(true);
  private readonly _isMuted = signal(true);
  private readonly _hlsError = signal(false);
  private readonly _groupPlayContentUrl = signal<string | null>(null);
  private readonly _groupPlayContentType = signal<string>('image');
  private readonly _isPending = signal(false);

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private hlsFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private currentHlsStreamId: string | null = null;

  readonly showCurrent = this._showCurrent.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly hlsError = this._hlsError.asReadonly();
  readonly groupPlayContentUrl = this._groupPlayContentUrl.asReadonly();
  readonly groupPlayContentType = this._groupPlayContentType.asReadonly();
  readonly isPending = this._isPending.asReadonly();

  readonly isLiveStreaming = computed(() => this.playerService.isLiveStreaming());
  readonly isSplitGroupPlay = computed(() => this._groupPlayContentUrl() !== null);

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
    const list = this.items();
    if (list.length === 0) return null;
    const idx = this._currentIndex();
    return list[idx % list.length] ?? null;
  });

  readonly nextItem = computed((): PlaylistItem | null => {
    const list = this.items();
    if (list.length <= 1) return null;
    const idx = this._currentIndex();
    return list[(idx + 1) % list.length] ?? null;
  });

  readonly currentMediaUrl = computed(() => {
    const item = this.currentItem();
    if (!item) return '';
    return this.buildMediaUrl(item.url);
  });

  readonly nextMediaUrl = computed(() => {
    const item = this.nextItem();
    if (!item) return '';
    if (item.type === 'video') return ''; // don't preload videos
    return this.buildMediaUrl(item.url);
  });

  constructor() {
    // React to playlist changes — reset playback position
    effect(() => {
      const playlist = this.playerService.activePlaylist();
      if (playlist) {
        this._currentIndex.set(0);
        this.clearAdvanceTimer();
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
        this._groupPlayContentType.set(this.inferContentType(event.contentUrl));
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
    this.clearHlsFallbackTimer();
    this.hlsService.destroy();
    this.playerService.disconnect();
  }

  onImageLoaded(): void {
    this._showCurrent.set(true);
    this.scheduleAdvance();
  }

  onVideoEnded(): void {
    this.advance();
  }

  onMediaError(): void {
    // Skip broken items — advance after a short delay
    setTimeout(() => {
      if (!this.destroyed) this.advance();
    }, 1000);
  }

  unmute(): void {
    this._isMuted.set(false);
    const videoEl = this.currentVideo()?.nativeElement;
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

  private buildMediaUrl(url: string): string {
    const serverUrl = this.connectionService.serverUrl();
    const apiKey = this.connectionService.apiKey();
    const separator = url.includes('?') ? '&' : '?';
    return `${serverUrl}${url}${separator}token=${apiKey}`;
  }

  private scheduleAdvance(): void {
    this.clearAdvanceTimer();
    const item = this.currentItem();
    if (!item || item.type === 'video') return;

    const durationMs = (item.duration || 10) * 1000;
    this.advanceTimer = setTimeout(() => {
      this.zone.run(() => this.advance());
    }, durationMs);
  }

  private advance(): void {
    if (this.destroyed) return;

    const list = this.items();
    if (list.length === 0) return;

    const prevIndex = this._currentIndex();
    const nextIndex = (prevIndex + 1) % list.length;
    const isWrapping = nextIndex === prevIndex;

    // Brief fade out
    this._showCurrent.set(false);

    setTimeout(() => {
      if (this.destroyed) return;
      this.zone.run(() => {
        this._currentIndex.set(nextIndex);

        const next = this.currentItem();
        if (!next) return;

        if (isWrapping) {
          // Same item — re-trigger playback manually
          if (next.type === 'video') {
            const videoEl = this.currentVideo()?.nativeElement;
            if (videoEl) {
              videoEl.currentTime = 0;
              videoEl.play().catch(() => undefined);
            }
            this._showCurrent.set(true);
            this._isMuted.set(true);
          } else {
            // Same image — (load) won't fire again, so schedule directly
            this._showCurrent.set(true);
            this.scheduleAdvance();
          }
        } else {
          // Different item
          if (next.type === 'video') {
            this._showCurrent.set(true);
            this._isMuted.set(true);
          }
          // For images, showCurrent is set in onImageLoaded
        }
      });
    }, 300); // Match CSS transition duration
  }

  private clearAdvanceTimer(): void {
    if (this.advanceTimer !== null) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  }

  private inferContentType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
      return 'video';
    }
    return 'image';
  }

  onGroupPlayImageLoaded(): void {
    this._showCurrent.set(true);
  }

  onGroupPlayVideoEnded(): void {
    // In split mode group_play, content stays until the next group_play event
  }
}
