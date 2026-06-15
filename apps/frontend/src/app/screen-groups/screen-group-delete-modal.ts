import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OverlayComponent, ModalComponent, BtnComponent } from '../ui';
import { ScreenGroup } from './screen-group.model';

/**
 * Delete-confirmation modal for a screen group (mns-overlay/mns-modal). Blocks
 * deletion while the group still has assigned screens; otherwise asks for
 * confirmation. The parent runs the HTTP work and feeds `deleting`/`error` back.
 */
@Component({
  selector: 'app-screen-group-delete-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Delete screen group" icon="Trash" [widthPx]="460" (closed)="dismiss.emit()">
        @if (blocked()) {
          <div
            class="text-[13px] leading-relaxed text-warn bg-warn-dim border border-warn/40 rounded-[10px] px-4 py-3"
          >
            Cannot delete "{{ group().name }}" because it still has
            {{ group().screens.length }} assigned screen(s). Remove all screens from the group
            before deleting it.
          </div>
        } @else {
          <p class="text-sm text-muted leading-relaxed">
            Are you sure you want to delete the screen group
            <strong class="text-text">{{ group().name }}</strong
            >? This action cannot be undone.
          </p>
          @if (error()) {
            <p class="text-offline text-sm mt-3">{{ error() }}</p>
          }
        }

        <div slot="footer" class="flex justify-end gap-2.5 px-6 py-5 border-t border-border">
          @if (blocked()) {
            <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Close</mns-btn>
          } @else {
            <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
            <mns-btn
              variant="danger"
              icon="Trash"
              [disabled]="deleting()"
              (mnsClick)="confirm.emit()"
              >{{ deleting() ? 'Deleting…' : 'Delete' }}</mns-btn
            >
          }
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class ScreenGroupDeleteModal {
  readonly group = input.required<ScreenGroup>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();

  readonly blocked = computed(() => this.group().screens.length > 0);
}
