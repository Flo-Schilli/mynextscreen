import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  StatusDotComponent,
  BadgeComponent,
} from '../ui';
import { Screen } from '../screens/screen.model';

/**
 * Mirror-mode "add screen to group" modal (mns-overlay/mns-modal). Presentational:
 * the parent supplies available screens, loading/error flags and the group id,
 * and runs the assignment on `add`.
 */
@Component({
  selector: 'app-screen-group-add-screen-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, StatusDotComponent, BadgeComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Add a screen" icon="Screens" [widthPx]="480" (closed)="dismiss.emit()">
        @if (loadingScreens()) {
          <p class="text-muted text-sm">Loading screens…</p>
        } @else if (availableScreens().length === 0) {
          <p class="text-muted text-[13px]">No unassigned screens available.</p>
        } @else {
          <div class="flex flex-col gap-2 max-h-[20rem] overflow-y-auto">
            @for (screen of availableScreens(); track screen.id) {
              <div
                class="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] bg-surface-2 border border-border"
              >
                <span class="w-[30px] h-[19px] rounded flex-shrink-0 bg-surface-3"></span>
                <div class="flex-1 min-w-0">
                  <div class="text-[13.5px] font-semibold truncate">{{ screen.name }}</div>
                  <div class="text-[11.5px] text-muted">{{ screen.location }}</div>
                </div>
                @if (screen.groupId && screen.groupId !== groupId()) {
                  <mns-badge tone="warning">In another group</mns-badge>
                }
                <mns-status-dot [status]="screen.isOnline ? 'online' : 'offline'" [size]="7" />
                <mns-btn
                  variant="soft"
                  size="sm"
                  icon="Plus"
                  [disabled]="
                    operationInProgress() || !!(screen.groupId && screen.groupId !== groupId())
                  "
                  (mnsClick)="add.emit(screen)"
                  >Add</mns-btn
                >
              </div>
            }
          </div>
          @if (error()) {
            <p class="text-offline text-sm mt-3">{{ error() }}</p>
          }
        }

        <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Close</mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class ScreenGroupAddScreenModal {
  readonly availableScreens = input.required<Screen[]>();
  readonly loadingScreens = input.required<boolean>();
  readonly error = input.required<string>();
  readonly groupId = input.required<string>();
  readonly operationInProgress = input.required<boolean>();

  readonly add = output<Screen>();
  readonly dismiss = output<void>();
}
