import { Component, inject, input, output } from '@angular/core';
import { Playlist } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';

/**
 * Presentational playlist grid: select-all header, the playlist cards (with
 * default badge, item count and duration), and the bulk-action toolbar. Reads
 * the parent-provided {@link SelectionService} instance and emits the clicked
 * playlist; the parent owns data loading and bulk-action handlers.
 */
@Component({
  selector: 'app-playlist-grid',
  standalone: true,
  imports: [SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent],
  template: `
    <div class="select-all-row">
      <app-select-all-checkbox [allIds]="playlistIds()" />
      <span class="select-all-label">Select all</span>
    </div>
    <div class="playlist-grid">
      @for (playlist of playlists(); track playlist.id; let i = $index) {
        <div
          class="playlist-card"
          [class.selected]="selectionService.selectedIds().has(playlist.id)"
          (click)="selectItem.emit(playlist)"
          tabindex="0"
          role="button"
          (keydown.enter)="selectItem.emit(playlist)"
          (keydown.space)="selectItem.emit(playlist)"
        >
          <div class="card-header">
            <app-selection-checkbox
              [itemId]="playlist.id"
              [itemIndex]="i"
              [orderedIds]="playlistIds()"
              (click)="$event.stopPropagation()"
            />
            <span class="playlist-name">{{ playlist.name }}</span>
            @if (playlist.id === defaultPlaylistId()) {
              <span class="default-badge">Default</span>
            }
          </div>
          <div class="card-body">
            <div class="card-field">
              <span class="card-label">Items</span>
              <span class="card-value">{{ playlist.items.length }}</span>
            </div>
            <div class="card-field">
              <span class="card-label">Duration</span>
              <span class="card-value">{{
                format.formatDuration(format.totalDurationSeconds(playlist.items))
              }}</span>
            </div>
            <div class="card-field">
              <span class="card-label">Created</span>
              <span class="card-value">{{ format.formatDate(playlist.createdAt) }}</span>
            </div>
          </div>
        </div>
      }
    </div>

    <app-bulk-action-toolbar [actions]="bulkActions()" />
  `,
  styles: `
    .select-all-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      padding: 0.25rem 0;
    }
    .select-all-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .playlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .playlist-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.25rem;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .playlist-card:hover,
    .playlist-card:focus {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
      outline: none;
    }
    .playlist-card.selected {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .playlist-name {
      font-size: 1rem;
      font-weight: 600;
      flex: 1;
    }
    .default-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 600;
      background: var(--color-accent);
      color: #fff;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card-field {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
    }
    .card-label {
      color: var(--color-text-secondary);
    }
    .card-value {
      color: var(--color-text-primary);
    }
  `,
})
export class PlaylistGrid {
  readonly playlists = input.required<Playlist[]>();
  readonly playlistIds = input.required<string[]>();
  readonly defaultPlaylistId = input.required<string | null>();
  readonly bulkActions = input.required<BulkAction[]>();
  readonly selectItem = output<Playlist>();

  protected readonly selectionService = inject(SelectionService);
  protected readonly format = inject(PlaylistFormatService);
}
