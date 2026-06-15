import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Playlist, PlaylistItem } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';
import { CardComponent, IconComponent } from '../ui';

/**
 * Presentational playlist grid: select-all header, the playlist cards (gradient
 * accent tile, item/duration subtitle, thumbnail strip, dots menu, default
 * badge) and the bulk-action toolbar. Reads the parent-provided
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
        <mns-card [hover]="true">
          <div class="flex flex-col gap-[15px]">
            <!-- header: checkbox + gradient tile + name/sub + dots -->
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
              <button
                type="button"
                class="flex-1 min-w-0 text-left cursor-pointer"
                (click)="selectItem.emit(playlist)"
              >
                <span class="block font-bold text-[15.5px] truncate">{{ playlist.name }}</span>
                <span class="block text-[12.5px] text-muted">
                  {{ playlist.items.length }} items ·
                  {{ format.formatDuration(format.totalDurationSeconds(playlist.items)) }}
                </span>
              </button>
              @if (playlist.id === defaultPlaylistId()) {
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-[99px] text-xs font-semibold text-accent bg-accent-soft"
                  >Default</span
                >
              }
              <div class="relative">
                <button
                  type="button"
                  title="Actions"
                  class="grid place-items-center w-8 h-8 rounded-lg border border-border text-muted transition-colors duration-[120ms] hover:bg-surface-3"
                  [class.bg-surface-3]="openMenuId() === playlist.id"
                  (click)="toggleMenu(playlist.id, $event)"
                >
                  <mns-icon name="Dots" [size]="18" />
                </button>
                @if (openMenuId() === playlist.id) {
                  <div
                    class="absolute z-50 top-full right-0 mt-1.5 w-40 bg-surface border border-border-strong rounded-md overflow-hidden py-1"
                    style="box-shadow: var(--shadow-lg)"
                  >
                    <button
                      type="button"
                      class="flex items-center gap-2.5 w-full px-3 py-2 text-[13.5px] font-semibold text-left text-text hover:bg-hover"
                      (click)="onOpen(playlist, $event)"
                    >
                      <mns-icon name="Pencil" [size]="15" /> Open editor
                    </button>
                    <button
                      type="button"
                      class="flex items-center gap-2.5 w-full px-3 py-2 text-[13.5px] font-semibold text-left text-offline hover:bg-hover"
                      (click)="onDelete(playlist, $event)"
                    >
                      <mns-icon name="Trash" [size]="15" /> Delete
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- thumbnail strip -->
            @if (playlist.items.length > 0) {
              <div class="flex gap-1.5">
                @for (item of strip(playlist.items); track item.id) {
                  <div
                    class="relative flex-1 aspect-[16/10] rounded-[6px] overflow-hidden bg-surface-2"
                  >
                    @if (item.content?.type === 'image') {
                      <img [src]="thumbUrl()(item)" alt="" class="w-full h-full object-cover" />
                    } @else {
                      <span class="absolute inset-0 grid place-items-center text-faint">
                        <mns-icon name="Play" [size]="13" />
                      </span>
                    }
                  </div>
                }
              </div>
            } @else {
              <div
                class="grid place-items-center py-5 rounded-[10px] border-[1.5px] border-dashed border-border-strong bg-surface-2 text-faint gap-1.5"
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
                class="inline-flex items-center gap-1 text-[13px] font-semibold text-accent cursor-pointer"
                (click)="selectItem.emit(playlist)"
              >
                Open <mns-icon name="Chevron" [size]="14" />
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
  readonly thumbUrl = input.required<(item: PlaylistItem) => string>();
  readonly selectItem = output<Playlist>();
  readonly deletePlaylist = output<Playlist>();

  protected readonly selectionService = inject(SelectionService);
  protected readonly format = inject(PlaylistFormatService);

  protected readonly openMenuId = signal<string | null>(null);

  protected strip(items: PlaylistItem[]): PlaylistItem[] {
    return items.slice(0, 6);
  }

  protected tileGradient(color: string): string {
    return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))`;
  }

  protected toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update((cur) => (cur === id ? null : id));
  }

  protected onOpen(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    this.selectItem.emit(playlist);
  }

  protected onDelete(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    this.deletePlaylist.emit(playlist);
  }
}
