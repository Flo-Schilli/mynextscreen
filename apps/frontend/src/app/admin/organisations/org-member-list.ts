import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrgMember, OrgMemberRole } from './organisation.model';
import { CardComponent, BtnComponent, SelectComponent, SelectOption } from '../../ui';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'org_admin', label: 'Org Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

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
  imports: [DatePipe, CardComponent, BtnComponent, SelectComponent],
  template: `
    <mns-card [pad]="false" class="block overflow-hidden">
      <div class="overflow-x-auto">
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
                {{ h }}
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
                {{ member.user.name || '(no name)' }}
              </div>
              <!-- email -->
              <div class="mono text-[12.5px] text-muted truncate">{{ member.user.email }}</div>
              <!-- role -->
              <div>
                <mns-select
                  class="role-select"
                  [options]="roleOptions"
                  [value]="member.role"
                  (changed)="changeRole.emit({ member, newRole: asRole($event) })"
                />
              </div>
              <!-- joined -->
              <div class="text-[12.5px] text-muted">
                {{ member.createdAt | date: 'mediumDate' }}
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

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly cols = 'minmax(140px,1.4fr) minmax(180px,1.6fr) 150px 132px 110px';
  protected readonly headers = ['Name', 'Email', 'Role', 'Joined', 'Actions'];

  protected asRole(value: string): OrgMemberRole {
    return value as OrgMemberRole;
  }
}
