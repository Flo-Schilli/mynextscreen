import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Screen } from '../screens/screen.model';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  SelectComponent,
  SFieldComponent,
  SelectOption,
} from '../ui';

/**
 * Presentational modal for bulk-assigning the selected playlists to a screen.
 * The chosen screen id is two-way bound via {@link model}; loading/error state
 * is fed in by the parent, which owns the fetch and the bulk-assign request.
 */
@Component({
  selector: 'app-playlist-assign-screen-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    SelectComponent,
    SFieldComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="t('playlists.assignScreen.title')"
        icon="Screens"
        (closed)="dismiss.emit()"
      >
        <div class="px-6 pt-4 pb-2">
          <p class="text-sm text-muted mb-4">
            {{ t('playlists.assignScreen.prompt', { count: count() }) }}
          </p>
          <mns-sfield [label]="t('playlists.assignScreen.screenLabel')">
            <mns-select
              [options]="screenOptions()"
              [(value)]="selectedScreenId"
              [placeholder]="t('playlists.assignScreen.selectPlaceholder')"
            />
          </mns-sfield>
          @if (loadError()) {
            <p class="text-offline text-sm mt-3">{{ loadError() }}</p>
          }
        </div>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn
            variant="primary"
            [disabled]="loading() || !selectedScreenId()"
            (mnsClick)="confirm.emit()"
          >
            {{
              loading() ? t('playlists.assignScreen.loading') : t('playlists.assignScreen.assign')
            }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class PlaylistAssignScreenModal {
  readonly screens = input.required<Screen[]>();
  readonly loading = input.required<boolean>();
  readonly loadError = input.required<string>();
  readonly count = input.required<number>();
  readonly selectedScreenId = model.required<string>();
  readonly confirm = output<void>();
  readonly dismiss = output<void>();

  protected readonly screenOptions = computed<SelectOption[]>(() =>
    this.screens().map((s) => ({ value: s.id, label: `${s.name} (${s.location})` })),
  );
}
