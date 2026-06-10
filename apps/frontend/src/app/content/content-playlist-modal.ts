import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Playlist } from '../playlists/playlist.model';

/**
 * Presentational modal for picking a playlist to bulk-add content to. The
 * chosen id is two-way bound via {@link model}; loading/error state is fed in
 * by the parent, which owns the fetch and the bulk-add request.
 */
@Component({
  selector: 'app-content-playlist-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add to playlist"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Add to Playlist</h2>
        @if (loading()) {
          <p>Loading playlists...</p>
        } @else if (loadError()) {
          <p class="error">{{ loadError() }}</p>
        } @else {
          <div class="playlist-list">
            @for (pl of playlists(); track pl.id) {
              <label class="playlist-option">
                <input type="radio" name="playlistPick" [value]="pl.id" [(ngModel)]="selectedId" />
                <span>{{ pl.name }}</span>
              </label>
            }
            @if (playlists().length === 0) {
              <p class="empty-text">No playlists available.</p>
            }
          </div>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button
            class="btn btn-primary"
            (click)="confirm.emit()"
            [disabled]="!selectedId() || loading()"
          >
            Add to Playlist
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .playlist-list {
      max-height: 16rem;
      overflow-y: auto;
      margin-bottom: 1rem;
    }
    .playlist-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--color-text-primary);
      transition: background 0.1s;
    }
    .playlist-option:hover {
      background: var(--color-bg-tertiary);
    }
    .playlist-option input[type='radio'] {
      accent-color: var(--color-accent);
    }
  `,
})
export class ContentPlaylistModal {
  readonly playlists = input.required<Playlist[]>();
  readonly loading = input.required<boolean>();
  readonly loadError = input.required<string>();
  readonly selectedId = model.required<string>();
  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
