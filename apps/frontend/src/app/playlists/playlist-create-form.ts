import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { PLAYLIST_COLORS } from './playlist.model';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  SInputComponent,
  SFieldComponent,
} from '../ui';

/**
 * Presentational create-playlist modal. Owns the name field and accent colour
 * via {@link model}; the parent performs the create request and feeds back
 * `creating`/`error`.
 */
@Component({
  selector: 'app-playlist-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, SInputComponent, SFieldComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="New playlist" icon="Playlists" (closed)="dismiss.emit()">
        <div class="px-6 pt-4 pb-2 flex flex-col gap-5">
          <mns-sfield label="Playlist name">
            <mns-sinput [(value)]="name" placeholder="e.g. Lobby Welcome Loop" />
          </mns-sfield>
          <div>
            <div class="text-[12.5px] font-semibold text-muted mb-[9px]">Accent colour</div>
            <div class="flex gap-[9px]">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="w-7 h-7 rounded-[8px] cursor-pointer"
                  [style.background]="c"
                  [style.border]="color() === c ? '2px solid #fff' : '2px solid transparent'"
                  [style.box-shadow]="color() === c ? '0 0 0 2px ' + c : 'none'"
                  [attr.aria-label]="'Set accent colour ' + c"
                  (click)="color.set(c)"
                ></button>
              }
            </div>
          </div>
          @if (error()) {
            <p class="text-offline text-sm">{{ error() }}</p>
          }
        </div>
        <div slot="footer" class="flex gap-2.5 px-6 pb-5">
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn
            variant="primary"
            [full]="true"
            icon="Plus"
            [disabled]="creating()"
            (mnsClick)="create.emit()"
          >
            {{ creating() ? 'Creating…' : 'Create playlist' }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class PlaylistCreateForm {
  readonly name = model.required<string>();
  readonly color = model.required<string>();
  readonly error = input.required<string>();
  readonly creating = input.required<boolean>();
  readonly create = output<void>();
  readonly dismiss = output<void>();

  protected readonly colors = PLAYLIST_COLORS;
}
