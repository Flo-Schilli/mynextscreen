import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Playlist } from '../playlists/playlist.model';
import { OverlayComponent, ModalComponent, BtnComponent } from '../ui';

/**
 * Presentational modal for picking a playlist to bulk-add content to. The
 * chosen id is two-way bound via {@link model}; loading/error state is fed in
 * by the parent, which owns the fetch and the bulk-add request.
 *
 * Built on the shared `mns-overlay` / `mns-modal` primitives. The `.playlist-list`,
 * `.playlist-option`, `.empty-text` and `.error` hooks are load-bearing for specs.
 */
@Component({
  selector: 'app-content-playlist-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Add to Playlist" icon="Playlists" (closed)="dismiss.emit()">
        @if (loading()) {
          <p class="text-sm text-muted">Loading playlists...</p>
        } @else if (loadError()) {
          <p class="error text-sm text-offline">{{ loadError() }}</p>
        } @else {
          <div class="playlist-list max-h-64 overflow-y-auto flex flex-col gap-1">
            @for (pl of playlists(); track pl.id) {
              <label
                class="playlist-option flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer text-sm text-text transition-colors duration-100 hover:bg-hover"
              >
                <input
                  type="radio"
                  name="playlistPick"
                  class="accent-[var(--accent)]"
                  [value]="pl.id"
                  [(ngModel)]="selectedId"
                />
                <span>{{ pl.name }}</span>
              </label>
            }
            @if (playlists().length === 0) {
              <p class="empty-text text-sm text-faint py-2">No playlists available.</p>
            }
          </div>
        }

        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn
            variant="primary"
            [disabled]="!selectedId() || loading()"
            (mnsClick)="confirm.emit()"
          >
            Add to Playlist
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
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
