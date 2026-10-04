import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuditLogService } from './audit-log.service';
import { MemberService } from '../settings/users/member.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import {
  AuditEntry,
  AuditLogFilters as AuditLogFilterParams,
  AUDIT_ACTIONS,
  RESOURCE_TYPES,
} from './audit-log.model';
import { Membership } from '../settings/users/member.model';
import { AuditLogFilters } from './audit-log-filters';
import { AuditLogTable } from './audit-log-table';
import {
  BtnComponent,
  CardComponent,
  EmptyComponent,
  IconComponent,
  PageHeaderComponent,
} from '../ui';

/**
 * Smart container for the audit-log feature. Owns the org-admin gate, data
 * loading + pagination, the filter state and the resolved user map. Presentation
 * is delegated to the filter bar and the entries table; navigation to a resource
 * is handled here.
 */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AuditLogFilters,
    AuditLogTable,
    BtnComponent,
    CardComponent,
    EmptyComponent,
    IconComponent,
    PageHeaderComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <mns-page-header
        [title]="t('auditLog.page.title')"
        [sub]="t('auditLog.page.subtitle')"
        icon="Audit"
      >
        <mns-btn variant="outline" size="md" icon="Refresh" (mnsClick)="refresh()">
          {{ t('auditLog.page.refresh') }}
        </mns-btn>
        <mns-btn variant="primary" size="md" icon="Download" (mnsClick)="exportCsv()">
          {{ t('auditLog.page.exportCsv') }}
        </mns-btn>
      </mns-page-header>

      @if (!isOrgAdmin()) {
        <p class="error text-[13.5px] text-offline bg-offline-dim rounded-[10px] px-4 py-3">
          {{ t('auditLog.page.accessDenied') }}
        </p>
      } @else {
        <!-- filter card -->
        <mns-card [pad]="true" [animate]="true" [delay]="0">
          <app-audit-log-filters
            [auditActions]="auditActions"
            [members]="members()"
            [resourceTypes]="resourceTypes"
            [(action)]="filterAction"
            [(userId)]="filterUserId"
            [(resourceType)]="filterResourceType"
            [(from)]="filterFrom"
            [(to)]="filterTo"
            (apply)="applyFilters()"
            (clear)="clearFilters()"
          />
        </mns-card>

        <!-- result count row -->
        @if (!loadError()) {
          <div class="flex items-center justify-between px-1 my-3">
            <span class="text-[13px] text-muted">
              @if (entries().length === total() && total() > 0) {
                <span class="font-bold text-text">{{ total() }}</span>
                {{ t('auditLog.page.eventsAll') }}
              } @else if (total() > 0) {
                <span class="font-bold text-text">{{ entries().length }}</span>
                {{ t('auditLog.page.eventsOf', { total: total() }) }}
              }
            </span>
          </div>
        }

        @if (loadError()) {
          <p class="error text-[13.5px] text-offline bg-offline-dim rounded-[10px] px-4 py-3 mt-3">
            {{ loadError() }}
          </p>
        }

        @if (loading() && entries().length === 0) {
          <mns-card [pad]="true">
            <div class="flex items-center justify-center gap-2.5 py-10 text-muted text-[13.5px]">
              <mns-icon name="Refresh" [size]="18" />
              <span>{{ t('auditLog.page.loading') }}</span>
            </div>
          </mns-card>
        }

        @if (!loading() && entries().length === 0 && !loadError()) {
          <mns-card [pad]="false">
            <mns-empty
              icon="Audit"
              [title]="t('auditLog.page.emptyTitle')"
              [desc]="t('auditLog.page.emptyDesc')"
            />
          </mns-card>
        }

        <!-- keep the mns-empty selector accessible for spec query -->
        <p class="empty-text sr-only" aria-hidden="true">
          @if (!loading() && entries().length === 0 && !loadError()) {
            {{ t('auditLog.page.emptyText') }}
          }
        </p>

        @if (entries().length > 0) {
          <app-audit-log-table
            [entries]="entries()"
            [total]="total()"
            [loading]="loading()"
            [hasMore]="hasMore()"
            [userMap]="userMap()"
            (loadMore)="loadMore()"
            (selectResource)="navigateToResource($event.resourceType, $event.resourceId)"
          />
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
      }
    }
  `,
})
export class AuditLog implements OnInit {
  private auditLogService = inject(AuditLogService);
  private memberService = inject(MemberService);
  private orgState = inject(OrganisationStateService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  readonly auditActions = AUDIT_ACTIONS;
  readonly resourceTypes = RESOURCE_TYPES;

  // View state — signals so OnPush re-renders after async loads complete.
  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly isOrgAdmin = signal(false);

  readonly members = signal<Membership[]>([]);
  readonly userMap = signal<Map<string, string>>(new Map());

  // Filter state — mutated only via template two-way bindings, which mark the
  // component dirty on their own, so plain fields are fine here.
  filterAction = '';
  filterUserId = '';
  filterResourceType = '';
  filterFrom = '';
  filterTo = '';

  private readonly pageSize = 50;

  readonly hasMore = computed(() => this.entries().length < this.total());

  ngOnInit(): void {
    const org = this.orgState.selectedOrg();
    if (!org) {
      this.loadError.set(this.transloco.translate('auditLog.errors.noOrgSelected'));
      this.loading.set(false);
      return;
    }

    if (org.role !== 'org_admin') {
      this.isOrgAdmin.set(false);
      this.loading.set(false);
      return;
    }

    this.isOrgAdmin.set(true);
    this.loadMembers(org.id);
    this.loadEntries();
  }

  private loadMembers(orgId: string): void {
    this.memberService.listMembers(orgId).subscribe({
      next: (members) => {
        this.members.set(members);
        const map = new Map<string, string>();
        for (const m of members) {
          map.set(m.userId, m.user.name || m.user.email);
        }
        this.userMap.set(map);
      },
    });
  }

  private buildFilters(offset = 0): AuditLogFilterParams {
    const filters: AuditLogFilterParams = {
      limit: this.pageSize,
      offset,
    };
    if (this.filterAction) filters.action = this.filterAction;
    if (this.filterUserId) filters.userId = this.filterUserId;
    if (this.filterResourceType) filters.resourceType = this.filterResourceType;
    if (this.filterFrom) filters.from = new Date(this.filterFrom).toISOString();
    if (this.filterTo) {
      const to = new Date(this.filterTo);
      to.setHours(23, 59, 59, 999);
      filters.to = to.toISOString();
    }
    return filters;
  }

  private loadEntries(): void {
    const org = this.orgState.selectedOrg();
    if (!org) return;

    this.loading.set(true);
    this.loadError.set('');

    this.auditLogService.getAuditLog(org.id, this.buildFilters(0)).subscribe({
      next: (response) => {
        this.entries.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err.status === 403
            ? this.transloco.translate('auditLog.errors.accessDenied')
            : this.transloco.translate('auditLog.errors.loadAuditLog'),
        );
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    const org = this.orgState.selectedOrg();
    if (!org) return;

    this.loading.set(true);

    this.auditLogService.getAuditLog(org.id, this.buildFilters(this.entries().length)).subscribe({
      next: (response) => {
        this.entries.update((cur) => [...cur, ...response.data]);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(this.transloco.translate('auditLog.errors.loadMore'));
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.entries.set([]);
    this.total.set(0);
    this.loadEntries();
  }

  refresh(): void {
    this.applyFilters();
  }

  exportCsv(): void {
    if (this.entries().length === 0) return;
    const headers = [
      'id',
      'timestamp',
      'userId',
      'organisationId',
      'action',
      'resourceType',
      'resourceId',
      'details',
    ];
    const rows = this.entries().map((e) => [
      e.id,
      e.timestamp,
      e.userId ?? '',
      e.organisationId ?? '',
      e.action,
      e.resourceType,
      e.resourceId ?? '',
      e.details ? JSON.stringify(e.details) : '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearFilters(): void {
    this.filterAction = '';
    this.filterUserId = '';
    this.filterResourceType = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  navigateToResource(resourceType: string, resourceId: string | null): void {
    if (!resourceId) return;

    const routeMap: Record<string, string> = {
      content: '/content',
      playlist: '/playlists',
      schedule: '/schedules',
      screen: '/screens',
      user: '/settings/users',
      organisation: '/admin/organisations',
    };

    const route = routeMap[resourceType];
    if (route) {
      this.router.navigate([route]);
    }
  }
}
