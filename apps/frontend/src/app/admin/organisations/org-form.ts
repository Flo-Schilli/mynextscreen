import { ChangeDetectionStrategy, Component, input, output, signal, OnInit } from '@angular/core';
import { Organisation } from './organisation.model';
import { IANA_TIME_ZONES } from './timezones';
import {
  CardComponent,
  CardHeadComponent,
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
 * Create/edit organisation form card. Seeds its field state once from the
 * optional `org` input on open (null = create; the parent recreates the
 * component via `@if`), validates locally and emits a resolved
 * {@link OrganisationFormPayload} (storage converted MB → bytes). The parent
 * performs the HTTP request and feeds `submitting`/`error` back in.
 */
@Component({
  selector: 'app-org-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    CardHeadComponent,
    BtnComponent,
    SFieldComponent,
    SInputComponent,
    SelectComponent,
  ],
  template: `
    <mns-card class="mb-8 block max-w-[40rem]">
      <mns-card-head
        [title]="org() ? 'Edit Organisation' : 'Create Organisation'"
        icon="Building"
      />
      <div class="flex flex-col gap-4">
        <mns-sfield label="Name">
          <mns-sinput placeholder="Organisation name" [(value)]="name" />
        </mns-sfield>

        <mns-sfield label="Time Zone">
          <mns-select
            [options]="timeZoneOptions"
            placeholder="Select a time zone"
            [(value)]="timeZone"
          />
        </mns-sfield>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <mns-sfield label="Original Storage Limit">
            <mns-sinput type="number" [mono]="true" suffix="MB" [(value)]="storageOriginalMB" />
          </mns-sfield>
          <mns-sfield label="Transcoded Storage Limit">
            <mns-sinput type="number" [mono]="true" suffix="MB" [(value)]="storageTranscodedMB" />
          </mns-sfield>
        </div>

        @if (localError() || error()) {
          <p class="error text-offline text-sm">{{ localError() || error() }}</p>
        }

        <div class="flex justify-end gap-2 mt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn variant="primary" [disabled]="submitting()" (mnsClick)="onSubmit()">
            {{ org() ? 'Save Changes' : 'Create' }}
          </mns-btn>
        </div>
      </div>
    </mns-card>
  `,
})
export class OrgForm implements OnInit {
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
      this.localError.set('Name and time zone are required.');
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
