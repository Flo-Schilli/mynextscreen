import { Component, input, output, signal, ElementRef, viewChild } from '@angular/core';

/**
 * Self-contained split-mode group-play view. Renders the sliced image/video the
 * server pushes for this screen's viewport and plays video muted on load. The
 * parent decides when to show this view and feeds the resolved media URL + type;
 * media errors bubble up via `mediaError`.
 */
@Component({
  selector: 'app-group-play-view',
  imports: [],
  template: `
    <div
      class="content-layer"
      [class.content-visible]="showCurrent()"
      [class.content-hidden]="!showCurrent()"
    >
      @if (contentType() === 'video') {
        <video
          #groupPlayVideo
          [src]="mediaUrl()"
          class="content-media"
          autoplay
          muted
          playsinline
          (loadeddata)="onVideoReady()"
          (ended)="onVideoEnded()"
          (error)="mediaError.emit($event)"
        ></video>
      } @else {
        <img
          [src]="mediaUrl()"
          class="content-media"
          alt=""
          (load)="onImageLoaded()"
          (error)="mediaError.emit($event)"
        />
      }
    </div>
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
    `,
  ],
})
export class GroupPlayViewComponent {
  readonly mediaUrl = input.required<string>();
  readonly contentType = input.required<string>();

  readonly mediaError = output<Event>();

  private readonly groupPlayVideo = viewChild<ElementRef<HTMLVideoElement>>('groupPlayVideo');

  private readonly _showCurrent = signal(true);
  readonly showCurrent = this._showCurrent.asReadonly();

  onImageLoaded(): void {
    this._showCurrent.set(true);
  }

  onVideoReady(): void {
    const videoEl = this.groupPlayVideo()?.nativeElement;
    if (videoEl) {
      videoEl.muted = true;
      videoEl.play().catch((err: Error) => {
        console.warn('[Playback] group play play() rejected:', err.message);
      });
    }
  }

  onVideoEnded(): void {
    // In split mode group_play, content stays until the next group_play event
  }
}
