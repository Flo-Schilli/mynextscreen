import { Component, computed, input, output, signal } from '@angular/core';
import { Content } from '../content/content.model';

/**
 * Presentational "add content to playlist" modal: a type filter and a grid of
 * transcoded content. Owns its own filter toggle; emits the picked content and
 * a dismiss intent. The parent loads `availableContent` and performs the add.
 */
@Component({
  selector: 'app-playlist-add-content-modal',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add content"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal modal-lg"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Add Content to Playlist</h2>

        @if (loading()) {
          <p class="loading-text">Loading content library...</p>
        } @else if (availableContent().length === 0) {
          <p class="empty-text">No content available. Upload content first.</p>
        } @else {
          <div class="content-type-filter">
            <button class="toggle-btn" [class.active]="!filter()" (click)="filter.set(undefined)">
              All
            </button>
            <button
              class="toggle-btn"
              [class.active]="filter() === 'image'"
              (click)="filter.set('image')"
            >
              Images
            </button>
            <button
              class="toggle-btn"
              [class.active]="filter() === 'video'"
              (click)="filter.set('video')"
            >
              Videos
            </button>
          </div>
          <div class="content-grid">
            @for (content of filteredContent(); track content.id) {
              <div
                class="content-item"
                (click)="selectContent.emit(content)"
                tabindex="0"
                role="button"
                (keydown.enter)="selectContent.emit(content)"
                (keydown.space)="selectContent.emit(content)"
              >
                @if (content.type === 'image') {
                  <img [src]="thumbUrl()(content)" alt="" class="content-thumb" />
                } @else {
                  <div class="content-thumb-video">
                    <span class="video-icon">&#9654;</span>
                  </div>
                }
                <div class="content-item-info">
                  <span class="content-item-title">{{ content.title }}</span>
                  <span
                    class="content-item-type"
                    [class.type-image]="content.type === 'image'"
                    [class.type-video]="content.type === 'video'"
                  >
                    {{ content.type }}
                  </span>
                </div>
              </div>
            }
          </div>
        }

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-lg {
      max-width: 52rem;
      width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    }
    .content-type-filter {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 1rem;
    }
    .toggle-btn {
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.8125rem;
      transition: all 0.15s;
    }
    .toggle-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .toggle-btn.active {
      background: var(--color-accent);
      color: #fff;
      border-color: var(--color-accent);
    }
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
      max-height: 50vh;
      overflow-y: auto;
    }
    .content-item {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .content-item:hover,
    .content-item:focus {
      border-color: var(--color-accent);
      outline: none;
    }
    .content-thumb {
      width: 100%;
      height: 6rem;
      object-fit: cover;
      display: block;
    }
    .content-thumb-video {
      width: 100%;
      height: 6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary);
      color: var(--color-text-muted);
      font-size: 1.5rem;
    }
    .video-icon {
      opacity: 0.6;
    }
    .content-item-info {
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .content-item-title {
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .content-item-type {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .type-image {
      color: #22c55e;
    }
    .type-video {
      color: #a78bfa;
    }
  `,
})
export class PlaylistAddContentModal {
  readonly availableContent = input.required<Content[]>();
  readonly loading = input.required<boolean>();
  readonly thumbUrl = input.required<(content: Content) => string>();
  readonly selectContent = output<Content>();
  readonly dismiss = output<void>();

  protected readonly filter = signal<'image' | 'video' | undefined>(undefined);

  protected readonly filteredContent = computed(() => {
    let content = this.availableContent().filter((c) => c.transcodingStatus === 'completed');
    const f = this.filter();
    if (f) {
      content = content.filter((c) => c.type === f);
    }
    return content;
  });
}
