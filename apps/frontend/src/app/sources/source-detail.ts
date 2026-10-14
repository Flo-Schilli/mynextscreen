import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Subscription, forkJoin, map, switchMap, takeWhile, timer } from 'rxjs';
import { ContentSourceService } from './content-source.service';
import { AdapterDescriptor, ContentSource, SourceEvent } from './content-source.model';
import {
  SourceFormValue,
  apiErrorMessage,
  sourceFormFrom,
  syncStatusTone,
  toUpdateRequest,
  validateSourceForm,
} from './source-form-state';
import { SourceForm } from './source-form';
import { SourceEventTable } from './source-event-table';
import { SourceAccess } from './source-access';
import { ToastService } from '../shared/toast/toast.service';
import { BackLink } from '../shared/back-link';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SwitchComponent,
} from '../ui';

/** Events requested per load; the table says so when the pool is longer. */
const EVENTS_PAGE = 200;
const SYNC_POLL_MS = 3000;
/** Stops polling after ~3 minutes; a longer sync shows up on the next visit. */
const SYNC_POLL_MAX = 60;

/**
 * One content source: sync status with "sync now", the settings form and the
 * event pool with slide previews. Viewers see everything read-only.
 */
@Component({
  selector: 'app-source-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BackLink,
    LocaleDatePipe,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    CardHeadComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SwitchComponent,
    SourceForm,
    SourceEventTable,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      @if (source(); as source) {
        <mns-page-header [title]="source.name" [sub]="adapterLabel()" icon="Globe">
          <app-back-link route="/sources" [label]="t('common.actions.back')" />
        </mns-page-header>

        <!-- sync status -->
        <mns-card>
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[220px]">
              <div class="flex flex-wrap items-center gap-2">
                <mns-badge [tone]="statusTone()">
                  {{ t('sources.status.' + (source.lastSyncStatus ?? 'never')) }}
                </mns-badge>
                @if (!source.enabled) {
                  <mns-badge tone="neutral">{{ t('sources.list.paused') }}</mns-badge>
                }
                <span class="text-[13px] text-muted">
                  {{
                    source.lastSyncAt
                      ? t('sources.detail.lastSync', {
                          date: source.lastSyncAt | localeDate: 'short',
                        })
                      : t('sources.detail.neverSynced')
                  }}
                </span>
              </div>
              @if (source.lastSyncSummary; as summary) {
                <div class="sync-summary mt-1.5 text-[13px] text-muted">
                  {{ t('sources.detail.summary', summary) }}
                </div>
              }
              @if (source.lastSyncError) {
                <div class="mt-1.5 text-[13px] text-offline">
                  {{ t('sources.detail.syncError', { error: source.lastSyncError }) }}
                </div>
              }
              @if (source.enabled) {
                <div class="mt-1.5 text-[12.5px] text-faint">
                  {{
                    source.nextSyncAt
                      ? t('sources.detail.nextSync', {
                          date: source.nextSyncAt | localeDate: 'short',
                        })
                      : t('sources.detail.nextSyncDue')
                  }}
                </div>
              }
            </div>
            @if (access.canEdit()) {
              <mns-btn
                class="sync-now"
                icon="Refresh"
                [disabled]="syncing()"
                (mnsClick)="syncNow()"
              >
                {{ syncing() ? t('sources.detail.syncing') : t('sources.detail.syncNow') }}
              </mns-btn>
            }
          </div>
        </mns-card>

        <!-- settings -->
        <div class="mt-[var(--gap)]">
          <mns-card>
            <mns-card-head
              [title]="t('sources.detail.settingsTitle')"
              [sub]="
                access.canEdit() ? t('sources.detail.settingsSub') : t('sources.detail.readOnly')
              "
              icon="Settings"
            />
            @if (form(); as value) {
              <app-source-form
                [adapters]="adapters()"
                [value]="value"
                (valueChange)="form.set($event)"
                [adapterLocked]="true"
                [disabled]="!access.canEdit()"
                [showErrors]="submitted()"
              />
            }
            @if (access.canEdit()) {
              <div class="mt-5 flex flex-wrap justify-between gap-2">
                <mns-btn variant="danger" icon="Trash" (mnsClick)="deleteOpen.set(true)">{{
                  t('common.actions.delete')
                }}</mns-btn>
                <mns-btn class="save-source" [disabled]="saving()" (mnsClick)="save()">
                  {{ saving() ? t('sources.detail.saving') : t('sources.detail.save') }}
                </mns-btn>
              </div>
            }
          </mns-card>
        </div>

        <!-- event pool -->
        <div class="mt-[var(--gap)]">
          <mns-card>
            <mns-card-head
              [title]="t('sources.events.title')"
              [sub]="t('sources.events.count', { count: events().length })"
              icon="Calendar"
            >
              <div slot="right" class="flex items-center gap-2 text-[13px] text-muted">
                <span>{{ t('sources.events.includeGone') }}</span>
                <mns-switch [checked]="includeGone()" (toggled)="setIncludeGone($event)" />
              </div>
            </mns-card-head>
            @if (eventsLoading()) {
              <p class="text-sm text-muted py-4">{{ t('sources.events.loading') }}</p>
            } @else if (events().length === 0) {
              <p class="text-sm text-muted py-4">{{ t('sources.events.empty') }}</p>
            } @else {
              <app-source-event-table [events]="events()" />
              @if (events().length >= eventsPage) {
                <p class="mt-3 text-[12.5px] text-faint">
                  {{ t('sources.events.truncated', { count: eventsPage }) }}
                </p>
              }
            }
          </mns-card>
        </div>

        @if (deleteOpen()) {
          <mns-overlay (closed)="deleteOpen.set(false)">
            <mns-modal
              [title]="t('sources.detail.deleteTitle')"
              icon="Trash"
              (closed)="deleteOpen.set(false)"
            >
              <p class="px-6 pt-4 text-sm text-muted">
                {{ t('sources.detail.deleteConfirm', { name: source.name }) }}
              </p>
              <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-4">
                <mns-btn variant="outline" (mnsClick)="deleteOpen.set(false)">{{
                  t('common.actions.cancel')
                }}</mns-btn>
                <mns-btn variant="danger" [disabled]="deleting()" (mnsClick)="remove()">
                  {{ deleting() ? t('common.actions.deleting') : t('common.actions.delete') }}
                </mns-btn>
              </div>
            </mns-modal>
          </mns-overlay>
        }
      } @else if (notFound()) {
        <div class="mb-4">
          <app-back-link route="/sources" [label]="t('common.actions.back')" />
        </div>
        <p class="text-sm text-offline">{{ t('sources.detail.notFound') }}</p>
      } @else {
        <p class="text-sm text-muted py-8 text-center">{{ t('sources.detail.loading') }}</p>
      }
    </ng-container>
  `,
  host: { class: 'block' },
})
export class SourceDetail {
  private readonly service = inject(ContentSourceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly access = inject(SourceAccess);

  private readonly sourceId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  protected readonly source = signal<ContentSource | null>(null);
  protected readonly adapters = signal<AdapterDescriptor[]>([]);
  protected readonly form = signal<SourceFormValue | null>(null);
  protected readonly events = signal<SourceEvent[]>([]);
  protected readonly eventsLoading = signal(false);
  protected readonly includeGone = signal(false);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly syncing = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly eventsPage = EVENTS_PAGE;

  private pollSub: Subscription | null = null;

  protected readonly adapterLabel = computed(() => {
    const type = this.source()?.adapterType ?? '';
    return this.adapters().find((a) => a.type === type)?.label ?? type;
  });
  protected readonly statusTone = computed(() =>
    syncStatusTone(this.source()?.lastSyncStatus ?? null),
  );
  private readonly schema = computed(
    () => this.adapters().find((a) => a.type === this.source()?.adapterType)?.paramsSchema ?? [],
  );

  constructor() {
    effect(() => {
      const orgId = this.access.orgId();
      const id = this.sourceId();
      if (orgId && id) untracked(() => this.load(orgId, id));
    });
    this.destroyRef.onDestroy(() => this.pollSub?.unsubscribe());
  }

  protected save(): void {
    const orgId = this.access.orgId();
    const source = this.source();
    const value = this.form();
    this.submitted.set(true);
    if (!orgId || !source || !value || validateSourceForm(value, this.schema()).length > 0) return;

    this.saving.set(true);
    this.service.update(orgId, source.id, toUpdateRequest(value, this.schema())).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.applySource(updated);
        this.toast.success(this.transloco.translate('sources.toast.updated'));
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(
          apiErrorMessage(err, this.transloco.translate('sources.toast.updateFailed')),
        );
      },
    });
  }

  protected syncNow(): void {
    const orgId = this.access.orgId();
    const source = this.source();
    if (!orgId || !source) return;
    this.syncing.set(true);
    this.service.sync(orgId, source.id).subscribe({
      next: () => {
        this.toast.success(this.transloco.translate('sources.toast.syncQueued'));
        this.pollUntilSynced(orgId, source.id, source.lastSyncAt);
      },
      error: () => {
        this.syncing.set(false);
        this.toast.error(this.transloco.translate('sources.toast.syncFailed'));
      },
    });
  }

  protected setIncludeGone(includeGone: boolean): void {
    this.includeGone.set(includeGone);
    const orgId = this.access.orgId();
    const source = this.source();
    if (orgId && source) this.loadEvents(orgId, source.id);
  }

  protected remove(): void {
    const orgId = this.access.orgId();
    const source = this.source();
    if (!orgId || !source) return;
    this.deleting.set(true);
    this.service.delete(orgId, source.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.toast.success(this.transloco.translate('sources.toast.deleted'));
        void this.router.navigate(['/sources']);
      },
      error: () => {
        this.deleting.set(false);
        this.toast.error(this.transloco.translate('sources.toast.deleteFailed'));
      },
    });
  }

  private load(orgId: string, id: string): void {
    this.notFound.set(false);
    forkJoin({ source: this.service.getOne(orgId, id), adapters: this.service.getAdapters(orgId) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ source, adapters }) => {
          this.adapters.set(adapters);
          this.applySource(source);
          this.loadEvents(orgId, id);
        },
        error: () => {
          this.source.set(null);
          this.notFound.set(true);
        },
      });
  }

  private applySource(source: ContentSource): void {
    this.source.set(source);
    this.form.set(
      sourceFormFrom(
        source,
        this.adapters().find((a) => a.type === source.adapterType),
      ),
    );
    this.submitted.set(false);
  }

  private loadEvents(orgId: string, id: string): void {
    this.eventsLoading.set(true);
    this.service
      .getEvents(orgId, id, { includeGone: this.includeGone(), limit: EVENTS_PAGE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events) => {
          this.events.set(events);
          this.eventsLoading.set(false);
        },
        error: () => {
          this.eventsLoading.set(false);
          this.toast.error(this.transloco.translate('sources.toast.eventsFailed'));
        },
      });
  }

  /**
   * The sync runs in a queue and the server pushes nothing for it, so the page
   * polls the source until its last sync has moved on and is no longer running.
   */
  private pollUntilSynced(orgId: string, id: string, previousSyncAt: string | null): void {
    this.pollSub?.unsubscribe();
    let polls = 0;
    const settled = (source: ContentSource): boolean =>
      source.lastSyncAt !== previousSyncAt && source.lastSyncStatus !== 'running';
    this.pollSub = timer(SYNC_POLL_MS, SYNC_POLL_MS)
      .pipe(
        switchMap(() => this.service.getOne(orgId, id)),
        takeWhile((source) => !settled(source) && ++polls < SYNC_POLL_MAX, true),
      )
      .subscribe({
        next: (source) => {
          // Only the status is refreshed: the form may hold unsaved edits.
          this.source.set(source);
          if (!settled(source)) return;
          this.syncing.set(false);
          this.toast.success(this.transloco.translate('sources.toast.syncFinished'));
          this.loadEvents(orgId, id);
        },
        error: () => this.syncing.set(false),
        complete: () => this.syncing.set(false),
      });
  }
}
