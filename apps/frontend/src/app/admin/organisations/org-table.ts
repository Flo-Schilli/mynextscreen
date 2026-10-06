import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Organisation } from './organisation.model';
import { formatBytes } from '../../shared/format-bytes';
import { CardComponent, BarComponent, AvatarComponent, BtnComponent } from '../../ui';
import { LocaleDatePipe } from '../../i18n/locale-format.pipes';

/**
 * Presentational organisations list. Renders one card-grid row per org with a
 * gradient initial tile, member count, a combined storage bar (originals +
 * transcoded vs. their limits) and created date, plus a "Manage" action that
 * emits the selected org. The parent owns data loading.
 */
@Component({
  selector: 'app-org-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocaleDatePipe,
    CardComponent,
    BarComponent,
    AvatarComponent,
    BtnComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-card [pad]="false" class="block overflow-hidden" *transloco="let t">
      <div class="overflow-x-auto">
        <div class="min-w-[760px]">
          <!-- header row -->
          <div
            class="grid gap-4 px-[22px] py-[13px] bg-surface-2 border-b border-border"
            [style.grid-template-columns]="cols"
          >
            @for (h of headers; track $index; let last = $last) {
              <div
                class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint"
                [class.text-right]="last"
              >
                {{ t(h) }}
              </div>
            }
          </div>

          <!-- rows -->
          @for (org of organisations(); track org.id) {
            <div
              class="grid gap-4 items-center px-[22px] py-[15px] border-t border-border hover:bg-hover transition-colors"
              [style.grid-template-columns]="cols"
            >
              <!-- organisation -->
              <div class="flex items-center gap-3 min-w-0">
                <mns-avatar [name]="org.name" [size]="38" />
                <div class="min-w-0">
                  <div class="text-[14px] font-bold truncate">{{ org.name }}</div>
                  <div class="mono text-[11.5px] text-faint mt-0.5 truncate">
                    {{ org.timeZone }}
                  </div>
                </div>
              </div>

              <!-- users -->
              <div class="mono text-[14px] font-semibold">{{ memberCountFor(org.id) }}</div>

              <!-- storage (combined) -->
              <div class="min-w-0">
                <mns-bar [value]="storagePct(org)" color="var(--accent)" [h]="7" />
                <div class="mono text-[11px] text-faint mt-[5px]">
                  {{ formatBytes(usedOf(org)) }} / {{ formatBytes(limitOf(org)) }} ·
                  {{ storagePct(org).toFixed(1) }}%
                </div>
              </div>

              <!-- created -->
              <div class="mono text-[12.5px] text-muted">
                {{ org.createdAt | localeDate: 'mediumDate' }}
              </div>

              <!-- actions -->
              <div class="flex justify-end">
                <mns-btn variant="outline" size="sm" icon="Eye" (mnsClick)="selectOrg.emit(org)">
                  {{ t('admin.orgTable.manage') }}
                </mns-btn>
              </div>
            </div>
          }
        </div>
      </div>
    </mns-card>
  `,
})
export class OrgTable {
  readonly organisations = input.required<Organisation[]>();
  readonly memberCounts = input.required<Record<string, number>>();

  readonly selectOrg = output<Organisation>();

  protected readonly formatBytes = formatBytes;
  protected readonly cols = '2.1fr 96px minmax(200px,1.4fr) 132px 110px';
  protected readonly headers = [
    'admin.orgTable.headers.organisation',
    'admin.orgTable.headers.users',
    'admin.orgTable.headers.storage',
    'admin.orgTable.headers.created',
    'admin.orgTable.headers.actions',
  ];

  protected memberCountFor(orgId: string): string {
    const count = this.memberCounts()[orgId] as number | undefined;
    return count === undefined ? '…' : String(count);
  }

  protected usedOf(org: Organisation): number {
    return org.storageOriginalUsedBytes + org.storageTranscodedUsedBytes;
  }

  protected limitOf(org: Organisation): number {
    return org.storageOriginalLimitBytes + org.storageTranscodedLimitBytes;
  }

  protected storagePct(org: Organisation): number {
    const limit = this.limitOf(org);
    if (limit <= 0) return 0;
    return Math.min((this.usedOf(org) / limit) * 100, 100);
  }
}
