import { inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { ScreenSessionService } from '../connection/screen-session.service';
import Hls, { ErrorData, Events } from 'hls.js';
import { ConnectionService } from '../connection/connection.service';
import { PlaybackStateService } from './playback-state.service';

@Injectable({ providedIn: 'root' })
export class HlsService implements OnDestroy {
  private readonly connection = inject(ConnectionService);
  private readonly session = inject(ScreenSessionService);
  private readonly playbackState = inject(PlaybackStateService);
  private readonly zone = inject(NgZone);

  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;

  attach(video: HTMLVideoElement, streamId: string): void {
    this.destroy();

    const serverUrl = this.connection.serverUrl();
    // No credential in the URL: hls.js can set a header on every request it
    // makes, for the manifest as well as for the segments.
    const hlsUrl = `${serverUrl}/api/live-streams/${streamId}/hls/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 2000,
        xhrSetup: (xhr: XMLHttpRequest) => {
          // Read per request, never captured: a stream runs for hours, and a
          // credential frozen into this closure would keep being sent long
          // after it stopped being valid — hls.js would then retry with the
          // dead value forever.
          xhr.setRequestHeader('Authorization', `Bearer ${this.session.token()}`);
        },
      });

      this.hls = hls;
      this.videoElement = video;

      hls.on(Events.MANIFEST_PARSED, () => {
        this.zone.run(() => this.playbackState.setStreamHealth('healthy'));
        video.play().catch(() => undefined);
      });

      hls.on(Events.ERROR, (_event: string, data: ErrorData) => {
        this.zone.run(() => {
          if (data.fatal) {
            this.playbackState.setStreamHealth('stopped');
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              this.destroy();
            }
          } else {
            this.playbackState.setStreamHealth('degraded');
          }
        });
      });

      hls.on(Events.FRAG_LOADED, () => {
        this.zone.run(() => {
          if (this.playbackState.streamHealth() === 'degraded') {
            this.playbackState.setStreamHealth('healthy');
          }
        });
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else {
      // There used to be a native-HLS branch for Safari here. It could not work:
      // the segment URIs in the FFmpeg-generated manifest are relative and carry
      // no credential, while the segment route requires screen auth, and a
      // <video> element cannot set headers. It only ever loaded the manifest —
      // and it was the sole reason the API key had to travel in the URL.
      this.videoElement = video;
      this.zone.run(() => this.playbackState.setStreamHealth('stopped'));
      console.error('[HLS] hls.js is not supported in this browser — live stream unavailable');
    }
  }

  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement = null;
    }
    this.playbackState.setStreamHealth(null);
  }

  isSupported(): boolean {
    return (
      Hls.isSupported() ||
      (typeof document !== 'undefined' &&
        !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl'))
    );
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
