import { Component, input, output } from '@angular/core';
import { OrgMember } from './organisation.model';

/**
 * Remove-member confirmation modal. The parent performs the HTTP request and
 * feeds `removing` back in to disable the confirm button.
 */
@Component({
  selector: 'app-org-remove-member-modal',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm removal"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Remove Member</h2>
        <p>
          Are you sure you want to remove
          <strong>{{ member().user.email }}</strong> from this organisation?
        </p>
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-danger" (click)="confirm.emit()" [disabled]="removing()">
            {{ removing() ? 'Removing...' : 'Remove' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class OrgRemoveMemberModal {
  readonly member = input.required<OrgMember>();
  readonly removing = input.required<boolean>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
