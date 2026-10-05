import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Organisation } from './organisation.model';
import { IANA_TIME_ZONES } from './timezones';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  SFieldComponent,
  SInputComponent,
  SelectComponent,
  SelectOption,
} from '../../ui';

export interface OrganisationFormPayload {
  name: string;
  timeZone: string;
  storageOriginalLimitBytes: number;
  storageTranscodedLimitBytes: number;
}

const TIME_ZONE_OPTIONS: SelectOption[] = IANA_TIME_ZONES.map((tz) => ({ value: tz, label: tz }));

/**
 * Create/edit organisation modal. Seeds its field state once from the optional
 * `org` input on open (null = create; the parent recreates the component via
 * `@if`), validates locally and emits a resolved
 * {@link OrganisationFormPayload} (storage converted MB → bytes). The parent
 * performs the HTTP request and feeds `submitting`/`error` back in.
 */
@Component({
  selector: 'app-org-form',
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
      <mns-modal
        [title]="org() ? t('admin.orgForm.editTitle') : t('admin.orgForm.createTitle')"
        icon="Building"
        [widthPx]="560"
        (closed)="dismiss.emit()"
      >
        <div class="flex flex-col gap-4">
          <mns-sfield [label]="t('admin.orgForm.nameLabel')">
            <mns-sinput [placeholder]="t('admin.orgForm.namePlaceholder')" [(value)]="name" />
          </mns-sfield>

          <mns-sfield [label]="t('admin.orgForm.timeZoneLabel')">
            <mns-select
              [options]="timeZoneOptions"
              [placeholder]="t('admin.orgForm.timeZonePlaceholder')"
              [(value)]="timeZone"
            />
          </mns-sfield>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <mns-sfield [label]="t('admin.orgForm.originalStorageLimit')">
              <mns-sinput type="number" [mono]="true" suffix="MB" [(value)]="storageOriginalMB" />
            </mns-sfield>
            <mns-sfield [label]="t('admin.orgForm.transcodedStorageLimit')">
              <mns-sinput type="number" [mono]="true" suffix="MB" [(value)]="storageTranscodedMB" />
            </mns-sfield>
          </div>

          @if (localError() || error()) {
            <p class="error text-offline text-sm">{{ localError() || error() }}</p>
          }
        </div>

        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn variant="primary" [disabled]="submitting()" (mnsClick)="onSubmit()">
            {{ org() ? t('admin.orgForm.saveChanges') : t('common.actions.create') }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class OrgForm implements OnInit {
  private readonly transloco = inject(TranslocoService);

  readonly org = input.required<Organisation | null>();
  readonly submitting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly save = output<OrganisationFormPayload>();
  readonly dismiss = output<void>();

  protected readonly timeZoneOptions = TIME_ZONE_OPTIONS;

  protected readonly name = signal('');
  protected readonly timeZone = signal('');
  protected readonly storageOriginalMB = signal('0');
  protected readonly storageTranscodedMB = signal('0');
  protected readonly localError = signal('');

  ngOnInit(): void {
    const org = this.org();
    if (org) {
      this.name.set(org.name);
      this.timeZone.set(org.timeZone);
      this.storageOriginalMB.set(String(Math.round(org.storageOriginalLimitBytes / (1024 * 1024))));
      this.storageTranscodedMB.set(
        String(Math.round(org.storageTranscodedLimitBytes / (1024 * 1024))),
      );
    }
  }

  onSubmit(): void {
    if (!this.name() || !this.timeZone()) {
      this.localError.set(this.transloco.translate('admin.orgForm.validationRequired'));
      return;
    }

    this.localError.set('');
    this.save.emit({
      name: this.name(),
      timeZone: this.timeZone(),
      storageOriginalLimitBytes: (Number(this.storageOriginalMB()) || 0) * 1024 * 1024,
      storageTranscodedLimitBytes: (Number(this.storageTranscodedMB()) || 0) * 1024 * 1024,
    });
  }
}
