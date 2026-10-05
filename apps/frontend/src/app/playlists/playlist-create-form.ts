import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
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
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    SInputComponent,
    SFieldComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('playlists.create.title')" icon="Playlists" (closed)="dismiss.emit()">
        <div class="px-6 pt-4 pb-2 flex flex-col gap-5">
          <mns-sfield [label]="t('playlists.create.nameLabel')">
            <mns-sinput [(value)]="name" [placeholder]="t('playlists.create.namePlaceholder')" />
          </mns-sfield>
          <div>
            <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
              {{ t('playlists.create.accentColor') }}
            </div>
            <div class="flex gap-[9px]">
              @for (c of colors; track c) {
                <button
                  type="button"
                  class="w-7 h-7 rounded-[8px] cursor-pointer"
                  [style.background]="c"
                  [style.border]="color() === c ? '2px solid #fff' : '2px solid transparent'"
                  [style.box-shadow]="color() === c ? '0 0 0 2px ' + c : 'none'"
                  [attr.aria-label]="t('playlists.create.setAccentColor', { color: c })"
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
          <mns-btn variant="outline" [full]="true" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn
            variant="primary"
            [full]="true"
            icon="Plus"
            [disabled]="creating()"
            (mnsClick)="create.emit()"
          >
            {{ creating() ? t('playlists.create.creating') : t('playlists.create.createPlaylist') }}
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
