import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { OrgMember, OrgMemberRole } from './organisation.model';
import { CardComponent, BtnComponent, SelectComponent, SelectOption } from '../../ui';
import { LocaleDatePipe } from '../../i18n/locale-format.pipes';

/**
 * Presentational organisation members list. Renders each member as a card-grid
 * row with an inline role selector and a remove button; emits role changes and
 * removals. The parent owns the HTTP calls and feeds the in-flight
 * `updatingMemberId`/`removingMemberId` back in to disable the relevant controls.
 */
@Component({
  selector: 'app-org-member-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocaleDatePipe, CardComponent, BtnComponent, SelectComponent, TranslocoDirective],
  template: `
    <mns-card [pad]="false" class="block overflow-hidden" *transloco="let t">
      <!-- ── table view (tablet and up) ── -->
      <div class="hidden md:block overflow-x-auto">
        <div class="min-w-[680px]">
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
          @for (member of members(); track member.id) {
            <div
              class="grid gap-4 items-center px-[22px] py-[13px] border-t border-border hover:bg-hover transition-colors"
              [style.grid-template-columns]="cols"
            >
              <!-- name -->
              <div class="text-[14px] font-semibold truncate">
                {{ member.user.name || t('admin.orgMemberList.noName') }}
              </div>
              <!-- email -->
              <div class="mono text-[12.5px] text-muted truncate">{{ member.user.email }}</div>
              <!-- role -->
              <div>
                <mns-select
                  class="role-select"
                  [options]="roleOptions()"
                  [value]="member.role"
                  (changed)="changeRole.emit({ member, newRole: asRole($event) })"
                />
              </div>
              <!-- joined -->
              <div class="text-[12.5px] text-muted">
                {{ member.createdAt | localeDate: 'mediumDate' }}
              </div>
              <!-- actions -->
              <div class="flex justify-end">
                <mns-btn
                  variant="danger"
                  size="sm"
                  icon="Trash"
                  [disabled]="removingMemberId() === member.userId"
                  (mnsClick)="removeMember.emit(member)"
                >
                  {{ t('common.actions.remove') }}
                </mns-btn>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ── stacked-card view (mobile) ── -->
      <div class="md:hidden flex flex-col">
        @for (member of members(); track member.id) {
          <div
            class="flex flex-col gap-3 p-[var(--card-pad)] border-t border-border first:border-t-0"
          >
            <!-- identity -->
            <div class="min-w-0">
              <div class="text-[14px] font-semibold truncate">
                {{ member.user.name || t('admin.orgMemberList.noName') }}
              </div>
              <div class="mono text-[12.5px] text-muted truncate">{{ member.user.email }}</div>
            </div>
            <!-- role -->
            <div class="flex items-center justify-between gap-3">
              <span class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">{{
                t('admin.orgMemberList.headers.role')
              }}</span>
              <mns-select
                class="role-select"
                [options]="roleOptions()"
                [value]="member.role"
                (changed)="changeRole.emit({ member, newRole: asRole($event) })"
              />
            </div>
            <!-- joined -->
            <div class="flex items-center justify-between gap-3">
              <span class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">{{
                t('admin.orgMemberList.headers.joined')
              }}</span>
              <span class="text-[12.5px] text-muted">{{
                member.createdAt | localeDate: 'mediumDate'
              }}</span>
            </div>
            <!-- actions -->
            <div class="flex justify-end">
              <mns-btn
                variant="danger"
                size="sm"
                icon="Trash"
                [disabled]="removingMemberId() === member.userId"
                (mnsClick)="removeMember.emit(member)"
              >
                Remove
              </mns-btn>
            </div>
          </div>
        }
      </div>
    </mns-card>
  `,
})
export class OrgMemberList {
  readonly members = input.required<OrgMember[]>();
  readonly updatingMemberId = input.required<string | null>();
  readonly removingMemberId = input.required<string | null>();

  readonly changeRole = output<{ member: OrgMember; newRole: OrgMemberRole }>();
  readonly removeMember = output<OrgMember>();

  private readonly transloco = inject(TranslocoService);

  protected readonly roleOptions = computed<SelectOption[]>(() => [
    { value: 'org_admin', label: this.transloco.translate('admin.organisations.roles.org_admin') },
    { value: 'editor', label: this.transloco.translate('admin.organisations.roles.editor') },
    { value: 'viewer', label: this.transloco.translate('admin.organisations.roles.viewer') },
  ]);
  protected readonly cols = 'minmax(140px,1.4fr) minmax(180px,1.6fr) 150px 132px 110px';
  protected readonly headers = [
    'admin.orgMemberList.headers.name',
    'admin.orgMemberList.headers.email',
    'admin.orgMemberList.headers.role',
    'admin.orgMemberList.headers.joined',
    'admin.orgMemberList.headers.actions',
  ];

  protected asRole(value: string): OrgMemberRole {
    return value as OrgMemberRole;
  }
}
