import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { OrgMemberRole } from './organisation.model';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  SFieldComponent,
  SInputComponent,
  SelectComponent,
  SelectOption,
} from '../../ui';

export interface AddMemberPayload {
  email: string;
  role: OrgMemberRole;
}

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'org_admin', label: 'Org Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

/**
 * Add-member modal. Owns its own email/role field state, validates locally and
 * emits a resolved {@link AddMemberPayload}. The parent performs the HTTP
 * request and feeds `adding`/`error` back in.
 */
@Component({
  selector: 'app-org-add-member-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    SFieldComponent,
    SInputComponent,
    SelectComponent,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Add Member" icon="User" (closed)="dismiss.emit()">
        <div class="flex flex-col gap-4">
          <mns-sfield label="Email">
            <mns-sinput type="email" icon="Mail" placeholder="user@example.com" [(value)]="email" />
          </mns-sfield>
          <mns-sfield label="Role">
            <mns-select [options]="roleOptions" [(value)]="role" />
          </mns-sfield>
          @if (localError() || error()) {
            <p class="error text-offline text-sm">{{ localError() || error() }}</p>
          }
        </div>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn variant="primary" [disabled]="adding()" (mnsClick)="onSubmit()">
            {{ adding() ? 'Adding…' : 'Add Member' }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class OrgAddMemberModal {
  readonly adding = input.required<boolean>();
  readonly error = input.required<string>();

  readonly add = output<AddMemberPayload>();
  readonly dismiss = output<void>();

  protected readonly roleOptions = ROLE_OPTIONS;

  protected readonly email = signal('');
  protected readonly role = signal<string>('viewer');
  protected readonly localError = signal('');

  onSubmit(): void {
    if (!this.email()) {
      this.localError.set('Email is required.');
      return;
    }

    this.localError.set('');
    this.add.emit({ email: this.email(), role: this.role() as OrgMemberRole });
  }
}
