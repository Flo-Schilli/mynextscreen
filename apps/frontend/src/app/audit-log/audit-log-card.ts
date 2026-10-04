import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuditEntry } from './audit-log.model';
import { BadgeComponent, BadgeTone, IconComponent } from '../ui';
import type { IconName } from '../ui';

/**
 * Mobile presentation of a single audit entry as a stacked label→value card.
 * Pure/presentational: the parent resolves all display strings (user, resource,
 * action label/meta/category, formatted details, detail entries) and feeds them
 * in. The card owns only its own expand/collapse state and emits `selectResource`
 * on a resource tap. Used below `md:` where the wide grid table is hidden.
 */
@Component({
  selector: 'app-audit-log-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, IconComponent, TranslocoDirective],
  template: `
    <div
      *transloco="let t"
      class="border-t border-border first:border-t-0"
      [class.bg-surface-2]="expanded()"
      [attr.data-card-expanded]="expanded()"
    >
      <!-- header: time + action badge, toggles expand -->
      <button
        type="button"
        class="touch-target w-full flex items-center gap-3 p-[var(--card-pad)] text-left hover:bg-hover transition-colors"
        [attr.aria-expanded]="expanded()"
        (click)="toggleExpand()"
      >
        <mns-icon
          name="Chevron"
          [size]="15"
          class="flex-shrink-0 text-faint transition-transform duration-[180ms]"
          [style.transform]="expanded() ? 'rotate(90deg)' : 'none'"
        />
        <div class="flex-1 min-w-0 flex flex-col gap-2">
          <!-- action badge -->
          <span class="card-action-badge" [attr.data-category]="actionCategory()">
            <mns-badge [tone]="actionMeta().tone" [icon]="actionMeta().icon">
              {{ actionLabel() }}
            </mns-badge>
          </span>
          <!-- time + user -->
          <div class="flex items-center gap-2 text-[12.5px] min-w-0">
            <span class="font-mono font-semibold text-text">{{
              entry().timestamp | date: 'HH:mm:ss'
            }}</span>
            <span class="text-faint">·</span>
            <span class="truncate font-semibold text-muted">{{ userDisplay() }}</span>
          </div>
        </div>
      </button>

      <!-- always-visible key fields -->
      <div class="px-[var(--card-pad)] pb-3 flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
            {{ t('auditLog.table.headerType') }}
          </span>
          <span class="text-[13px] text-muted truncate">{{ entry().resourceType }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 min-w-0">
          <span
            class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint flex-shrink-0"
            >{{ t('auditLog.table.headerResource') }}</span
          >
          @if (entry().resourceId) {
            <button
              type="button"
              class="card-resource-link font-mono text-[12.5px] font-semibold text-info truncate hover:underline focus:outline-none focus:underline"
              [title]="resourceDisplay()"
              (click)="onResourceClick($event)"
            >
              {{ resourceDisplay() }}
            </button>
          } @else {
            <span class="text-muted text-[13px]">—</span>
          }
        </div>
      </div>

      <!-- expanded detail block -->
      @if (expanded()) {
        <div
          class="px-[var(--card-pad)] pb-[var(--card-pad)]"
          style="animation:fadeIn .18s ease both"
        >
          <div class="border-t border-dashed border-border-strong pt-3.5 flex flex-col gap-3">
            <div class="min-w-0">
              <div class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1">
                {{ t('auditLog.table.eventId') }}
              </div>
              <div class="font-mono text-[12.5px] font-semibold text-text break-all">
                {{ entry().id }}
              </div>
            </div>
            <div class="min-w-0">
              <div class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1">
                {{ t('auditLog.table.resourceId') }}
              </div>
              <div class="font-mono text-[12.5px] font-semibold text-text break-all">
                {{ entry().resourceId ?? '—' }}
              </div>
            </div>
            <div class="min-w-0">
              <div class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1">
                {{ t('auditLog.table.timestamp') }}
              </div>
              <div class="text-[13.5px] font-semibold text-text">
                {{ entry().timestamp | date: 'medium' }}
              </div>
            </div>
            @for (kv of detailEntries(); track kv.key) {
              <div class="min-w-0">
                <div class="text-[10.5px] font-bold tracking-[.06em] uppercase text-faint mb-1">
                  {{ kv.key }}
                </div>
                <div class="text-[13.5px] font-semibold text-accent break-words">
                  {{ kv.value }}
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .card-action-badge {
      align-self: flex-start;
    }
    .card-action-badge[data-category='content'] mns-badge span,
    .card-action-badge[data-category='group'] mns-badge span,
    .card-action-badge[data-category='email'] mns-badge span {
      background: var(--info-dim);
      color: var(--color-info);
    }
    .card-action-badge[data-category='playlist'] mns-badge span,
    .card-action-badge[data-category='schedule'] mns-badge span,
    .card-action-badge[data-category='auth'] mns-badge span {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .card-action-badge[data-category='screen'] mns-badge span {
      background: var(--warn-dim);
      color: var(--color-warn);
    }
    .card-action-badge[data-category='user'] mns-badge span {
      background: var(--offline-dim);
      color: var(--color-offline);
    }
    .card-action-badge[data-category='organisation'] mns-badge span,
    .card-action-badge[data-category='live_stream'] mns-badge span {
      background: var(--online-dim);
      color: var(--color-online);
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
    }
  `,
})
export class AuditLogCard {
  readonly entry = input.required<AuditEntry>();
  readonly userDisplay = input.required<string>();
  readonly resourceDisplay = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly actionCategory = input.required<string>();
  readonly actionMeta = input.required<{ tone: BadgeTone; icon: IconName }>();
  readonly detailEntries = input<{ key: string; value: string }[]>([]);

  readonly selectResource = output<{ resourceType: string; resourceId: string | null }>();

  protected readonly expanded = signal(false);

  protected toggleExpand(): void {
    this.expanded.update((v) => !v);
  }

  protected onResourceClick(event: Event): void {
    event.stopPropagation();
    const e = this.entry();
    this.selectResource.emit({ resourceType: e.resourceType, resourceId: e.resourceId });
  }
}
