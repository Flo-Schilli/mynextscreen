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
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { ContentSourceService } from './content-source.service';
import { AdapterDescriptor, ContentSource } from './content-source.model';
import {
  SourceFormValue,
  apiErrorMessage,
  emptySourceForm,
  formatLabel,
  syncStatusTone,
  toCreateRequest,
  validateSourceForm,
} from './source-form-state';
import { SourceForm } from './source-form';
import { SourceAccess } from './source-access';
import { ToastService } from '../shared/toast/toast.service';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  EmptyComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
} from '../ui';

/**
 * Content sources of the active organisation: one card per source with the
 * outcome of its last sync, plus the create dialog. Opening a card leads to
 * {@link SourceDetail}.
 */
@Component({
  selector: 'app-sources',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocaleDatePipe,
    RouterLink,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    EmptyComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SourceForm,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <mns-page-header [title]="t('sources.list.title')" [sub]="countLabel()" icon="Globe">
        @if (access.canEdit() && !loading()) {
          <mns-btn icon="Plus" (mnsClick)="openCreate()">{{ t('sources.list.add') }}</mns-btn>
        }
      </mns-page-header>

      @if (loading()) {
        <div class="text-sm text-muted py-8 text-center">{{ t('sources.list.loading') }}</div>
      } @else if (sources().length === 0) {
        <mns-empty
          icon="Globe"
          [title]="t('sources.list.emptyTitle')"
          [desc]="t('sources.list.emptyDesc')"
        >
          @if (access.canEdit()) {
            <mns-btn icon="Plus" (mnsClick)="openCreate()">{{ t('sources.list.add') }}</mns-btn>
          }
        </mns-empty>
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (source of sources(); track source.id) {
            <a [routerLink]="['/sources', source.id]" class="source-card block">
              <mns-card [hover]="true" [hoverAccent]="true" [clickable]="true">
                <div class="flex items-start gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">{{ source.name }}</div>
                    <div class="text-[13px] text-muted truncate">
                      {{ adapterLabel(source.adapterType) }}
                    </div>
                  </div>
                  @if (!source.enabled) {
                    <mns-badge tone="neutral">{{ t('sources.list.paused') }}</mns-badge>
                  }
                  <mns-badge [tone]="statusTone(source)">
                    {{ t('sources.status.' + (source.lastSyncStatus ?? 'never')) }}
                  </mns-badge>
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                  <dt class="text-muted">{{ t('sources.list.lastSync') }}</dt>
                  <dd>
                    {{
                      source.lastSyncAt
                        ? (source.lastSyncAt | localeDate: 'short')
                        : t('sources.list.never')
                    }}
                  </dd>
                  <dt class="text-muted">{{ t('sources.list.nextSync') }}</dt>
                  <dd>
                    {{
                      source.enabled && source.nextSyncAt
                        ? (source.nextSyncAt | localeDate: 'short')
                        : '—'
                    }}
                  </dd>
                  <dt class="text-muted">{{ t('sources.list.formats') }}</dt>
                  <dd>{{ formatsLabel(source) }}</dd>
                </dl>
              </mns-card>
            </a>
          }
        </div>
      }

      @if (createOpen()) {
        <mns-overlay (closed)="closeCreate()">
          <mns-modal [title]="t('sources.create.title')" icon="Globe" (closed)="closeCreate()">
            <div class="px-6 pt-4 pb-2">
              <app-source-form
                [adapters]="adapters()"
                [(value)]="form"
                [showErrors]="submitted()"
              />
            </div>
            <div slot="footer" class="flex gap-2.5 px-6 pb-5">
              <mns-btn variant="outline" [full]="true" (mnsClick)="closeCreate()">{{
                t('common.actions.cancel')
              }}</mns-btn>
              <mns-btn
                variant="primary"
                [full]="true"
                icon="Plus"
                [disabled]="creating()"
                (mnsClick)="create()"
              >
                {{ creating() ? t('sources.create.creating') : t('sources.create.submit') }}
              </mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
      }
    </ng-container>
  `,
  host: { class: 'block' },
})
export class Sources {
  private readonly service = inject(ContentSourceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly access = inject(SourceAccess);

  protected readonly sources = signal<ContentSource[]>([]);
  protected readonly adapters = signal<AdapterDescriptor[]>([]);
  protected readonly loading = signal(true);
  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly submitted = signal(false);
  protected readonly form = signal<SourceFormValue>(emptySourceForm(undefined));

  protected readonly countLabel = computed(() =>
    this.transloco.translate('sources.list.count', { count: this.sources().length }),
  );

  constructor() {
    // Reloads on an organisation switch, like the rest of the org-scoped pages.
    effect(() => {
      const orgId = this.access.orgId();
      if (orgId) untracked(() => this.load(orgId));
    });
  }

  protected adapterLabel(type: string): string {
    return this.adapters().find((a) => a.type === type)?.label ?? type;
  }

  protected statusTone(source: ContentSource): ReturnType<typeof syncStatusTone> {
    return syncStatusTone(source.lastSyncStatus);
  }

  protected formatsLabel(source: ContentSource): string {
    return source.formats.map(formatLabel).join(', ');
  }

  protected openCreate(): void {
    this.form.set(emptySourceForm(this.adapters()[0]));
    this.submitted.set(false);
    this.createOpen.set(true);
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
  }

  protected create(): void {
    const orgId = this.access.orgId();
    const value = this.form();
    const schema = this.adapters().find((a) => a.type === value.adapterType)?.paramsSchema ?? [];
    this.submitted.set(true);
    if (!orgId || validateSourceForm(value, schema).length > 0) return;

    this.creating.set(true);
    this.service.create(orgId, toCreateRequest(value, schema)).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.createOpen.set(false);
        this.toast.success(this.transloco.translate('sources.toast.created'));
        void this.router.navigate(['/sources', created.id]);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.toast.error(
          apiErrorMessage(err, this.transloco.translate('sources.toast.createFailed')),
        );
      },
    });
  }

  private load(orgId: string): void {
    this.loading.set(true);
    forkJoin({ sources: this.service.getAll(orgId), adapters: this.service.getAdapters(orgId) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sources, adapters }) => {
          this.sources.set(sources);
          this.adapters.set(adapters);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(this.transloco.translate('sources.toast.loadFailed'));
        },
      });
  }
}
