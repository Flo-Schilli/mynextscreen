import { inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import Hls, { ErrorData, Events } from 'hls.js';
import { ConnectionService } from '../connection/connection.service';
import { PlaybackStateService } from './playback-state.service';

@Injectable({ providedIn: 'root' })
export class HlsService implements OnDestroy {
  private readonly connection = inject(ConnectionService);
  private readonly playbackState = inject(PlaybackStateService);
  private readonly zone = inject(NgZone);

  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;

  attach(video: HTMLVideoElement, streamId: string): void {
    this.destroy();

    const serverUrl = this.connection.serverUrl();
    const apiKey = this.connection.apiKey();
    const hlsUrl = `${serverUrl}/api/live-streams/${streamId}/hls/index.m3u8?token=${apiKey}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
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
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      this.videoElement = video;
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        this.zone.run(() => this.playbackState.setStreamHealth('healthy'));
        video.play().catch(() => undefined);
      });
      video.addEventListener('error', () => {
        this.zone.run(() => this.playbackState.setStreamHealth('stopped'));
      });
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
