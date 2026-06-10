import {
  Component,
  inject,
  input,
  signal,
  OnDestroy,
  ElementRef,
  viewChild,
  effect,
  NgZone,
} from '@angular/core';
import { HlsService } from './hls.service';
import { PlaybackStateService } from './playback-state.service';

/**
 * Self-contained live-stream (HLS) view. Owns the `<video>` element, attaches/
 * detaches HLS for the `streamId` input, monitors stream health to surface an
 * "unavailable" state, and manages its own mute overlay. The parent only decides
 * when to show this view and which stream id to feed it.
 */
@Component({
  selector: 'app-live-stream-view',
  imports: [],
  template: `
    <div class="content-layer layer-active">
      @if (hlsError()) {
        <div class="no-content">
          <p class="text-red-400 text-lg">Live stream unavailable</p>
        </div>
      } @else {
        <video #hlsVideo class="content-media" autoplay muted playsinline></video>
      }
    </div>

    @if (isMuted()) {
      <button class="unmute-overlay" (click)="unmute()" (keydown.enter)="unmute()">
        <span class="unmute-icon">🔇</span>
        <span class="text-sm">Click to unmute</span>
      </button>
    }
  `,
  styles: [
    `
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
      .content-media {
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .no-content {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: #000;
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
    `,
  ],
})
export class LiveStreamViewComponent implements OnDestroy {
  readonly streamId = input.required<string | null>();

  private readonly hlsService = inject(HlsService);
  private readonly playbackState = inject(PlaybackStateService);
  private readonly zone = inject(NgZone);

  private readonly hlsVideo = viewChild<ElementRef<HTMLVideoElement>>('hlsVideo');

  private readonly _isMuted = signal(true);
  private readonly _hlsError = signal(false);

  readonly isMuted = this._isMuted.asReadonly();
  readonly hlsError = this._hlsError.asReadonly();

  private currentHlsStreamId: string | null = null;
  private hlsFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      const id = this.streamId();
      if (id) {
        this.startHls(id);
      } else {
        this.stopHls();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearHlsFallbackTimer();
    this.hlsService.destroy();
  }

  unmute(): void {
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
      if (this.destroyed) return;
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
}
