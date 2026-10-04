import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('admin.addMemberModal.title')" icon="User" (closed)="dismiss.emit()">
        <div class="flex flex-col gap-4">
          <mns-sfield [label]="t('admin.addMemberModal.emailLabel')">
            <mns-sinput
              type="email"
              icon="Mail"
              [placeholder]="t('admin.addMemberModal.emailPlaceholder')"
              [(value)]="email"
            />
          </mns-sfield>
          <mns-sfield [label]="t('admin.addMemberModal.roleLabel')">
            <mns-select [options]="roleOptions()" [(value)]="role" />
          </mns-sfield>
          @if (localError() || error()) {
            <p class="error text-offline text-sm">{{ localError() || error() }}</p>
          }
        </div>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn variant="primary" [disabled]="adding()" (mnsClick)="onSubmit()">
            {{ adding() ? t('admin.addMemberModal.adding') : t('admin.addMemberModal.title') }}
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

  private readonly transloco = inject(TranslocoService);

  protected readonly roleOptions = computed<SelectOption[]>(() => [
    { value: 'org_admin', label: this.transloco.translate('admin.organisations.roles.org_admin') },
    { value: 'editor', label: this.transloco.translate('admin.organisations.roles.editor') },
    { value: 'viewer', label: this.transloco.translate('admin.organisations.roles.viewer') },
  ]);

  protected readonly email = signal('');
  protected readonly role = signal<string>('viewer');
  protected readonly localError = signal('');

  onSubmit(): void {
    if (!this.email()) {
      this.localError.set(this.transloco.translate('admin.addMemberModal.emailRequired'));
      return;
    }

    this.localError.set('');
    this.add.emit({ email: this.email(), role: this.role() as OrgMemberRole });
  }
}
