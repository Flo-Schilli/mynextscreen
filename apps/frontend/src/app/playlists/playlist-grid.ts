import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Playlist, PlaylistItem } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';
import { CardComponent, IconComponent } from '../ui';

/**
 * Presentational playlist grid: select-all header, the playlist cards (gradient
 * accent tile, item/duration subtitle, fixed-height thumbnail strip, default
 * badge, trash action) and the bulk-action toolbar. The whole card is clickable
 * to open; a trash button deletes. Reads the parent-provided
 * {@link SelectionService} instance and emits the clicked playlist / delete
 * intent; the parent owns data loading and bulk-action handlers.
 */
@Component({
  selector: 'app-playlist-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SelectionCheckboxComponent,
    SelectAllCheckboxComponent,
    BulkActionToolbarComponent,
    CardComponent,
    IconComponent,
  ],
  template: `
    <div class="flex items-center gap-2 mb-3 py-1">
      <app-select-all-checkbox [allIds]="playlistIds()" />
      <span class="text-[13px] text-muted">Select all</span>
    </div>

    <div class="grid gap-[var(--gap)] grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
      @for (playlist of playlists(); track playlist.id; let i = $index) {
        <mns-card [hover]="true" [hoverAccent]="true" [clickable]="true">
          <div
            class="flex flex-col gap-[15px] cursor-pointer"
            [attr.aria-label]="'Open ' + playlist.name"
            (click)="selectItem.emit(playlist)"
            (keydown.enter)="selectItem.emit(playlist)"
            (keydown.space)="selectItem.emit(playlist)"
            tabindex="0"
            role="button"
          >
            <!-- header: checkbox + gradient tile + name/sub + default badge -->
            <div class="flex items-center gap-3">
              <app-selection-checkbox
                [itemId]="playlist.id"
                [itemIndex]="i"
                [orderedIds]="playlistIds()"
                (click)="$event.stopPropagation()"
              />
              <span
                class="grid place-items-center w-11 h-11 rounded-[12px] text-white flex-shrink-0"
                [style.background]="tileGradient(playlist.color)"
              >
                <mns-icon name="Playlists" [size]="22" />
              </span>
              <div class="flex-1 min-w-0">
                <span class="block font-bold text-[15.5px] truncate">{{ playlist.name }}</span>
                <span class="block text-[12.5px] text-muted">
                  {{ playlist.items.length }} items ·
                  {{ format.formatDuration(format.totalDurationSeconds(playlist.items)) }}
                </span>
              </div>
              @if (playlist.id === defaultPlaylistId()) {
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-[99px] text-xs font-semibold text-accent bg-accent-soft"
                  >Default</span
                >
              }
            </div>

            <!-- thumbnail strip (fixed height — card size never depends on item count) -->
            @if (playlist.items.length > 0) {
              <div class="flex gap-1.5 h-[92px]">
                @for (item of strip(playlist.items); track item.id) {
                  <div
                    class="relative flex-1 min-w-0 h-full rounded-[6px] overflow-hidden bg-surface-2"
                  >
                    @if (thumbUrl()(item); as src) {
                      <img [src]="src" alt="" class="w-full h-full object-cover" loading="lazy" />
                      @if (item.content?.type === 'video') {
                        <span class="absolute inset-0 grid place-items-center pointer-events-none">
                          <span
                            class="grid place-items-center w-7 h-7 rounded-full bg-black/45 text-white"
                          >
                            <mns-icon name="Play" [size]="12" />
                          </span>
                        </span>
                      }
                    } @else if (item.content?.type === 'video') {
                      <span class="absolute inset-0 grid place-items-center text-white bg-black/45">
                        <mns-icon name="Play" [size]="13" />
                      </span>
                    } @else {
                      <span class="absolute inset-0 grid place-items-center text-faint">
                        <mns-icon name="Image" [size]="13" />
                      </span>
                    }
                  </div>
                }
              </div>
            } @else {
              <div
                class="grid place-items-center h-[92px] rounded-[10px] border-[1.5px] border-dashed border-border-strong bg-surface-2 text-faint gap-1.5"
              >
                <mns-icon name="Playlists" [size]="20" />
                <span class="text-[12.5px] font-semibold">Empty playlist</span>
              </div>
            }

            <!-- footer -->
            <div class="flex items-center justify-between">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold text-muted bg-surface-3"
              >
                <mns-icon name="Playlists" [size]="12" /> {{ playlist.items.length }} items
              </span>
              <button
                type="button"
                class="grid place-items-center w-8 h-8 rounded-lg border border-border text-muted transition-colors duration-[120ms] hover:text-white hover:bg-offline hover:border-offline"
                [attr.aria-label]="'Delete ' + playlist.name"
                (click)="onDelete(playlist, $event)"
              >
                <mns-icon name="Trash" [size]="15" />
              </button>
            </div>
          </div>
        </mns-card>
      }
    </div>

    <app-bulk-action-toolbar [actions]="bulkActions()" />
  `,
})
export class PlaylistGrid {
  readonly playlists = input.required<Playlist[]>();
  readonly playlistIds = input.required<string[]>();
  readonly defaultPlaylistId = input.required<string | null>();
  readonly bulkActions = input.required<BulkAction[]>();
  readonly thumbUrl = input.required<(item: PlaylistItem) => string | null>();
  readonly selectItem = output<Playlist>();
  readonly deletePlaylist = output<Playlist>();

  protected readonly selectionService = inject(SelectionService);
  protected readonly format = inject(PlaylistFormatService);

  protected strip(items: PlaylistItem[]): PlaylistItem[] {
    return items.slice(0, 6);
  }

  protected tileGradient(color: string): string {
    return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))`;
  }

  /** Trash button — stop the click bubbling up to the card's `selectItem` handler. */
  protected onDelete(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    this.deletePlaylist.emit(playlist);
  }
}
