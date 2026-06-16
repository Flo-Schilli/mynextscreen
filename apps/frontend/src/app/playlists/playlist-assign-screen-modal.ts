import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
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
  imports: [OverlayComponent, ModalComponent, BtnComponent, SelectComponent, SFieldComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Assign to screen" icon="Screens" (closed)="dismiss.emit()">
        <div class="px-6 pt-4 pb-2">
          <p class="text-sm text-muted mb-4">
            Select a screen to assign
            <strong class="text-text">{{ count() }} playlist(s)</strong> to:
          </p>
          <mns-sfield label="Screen">
            <mns-select
              [options]="screenOptions()"
              [(value)]="selectedScreenId"
              placeholder="-- Select a screen --"
            />
          </mns-sfield>
          @if (loadError()) {
            <p class="text-offline text-sm mt-3">{{ loadError() }}</p>
          }
        </div>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn
            variant="primary"
            [disabled]="loading() || !selectedScreenId()"
            (mnsClick)="confirm.emit()"
          >
            {{ loading() ? 'Loading…' : 'Assign' }}
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
