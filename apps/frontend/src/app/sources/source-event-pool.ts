import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Subscription, catchError, of } from 'rxjs';
import { ContentSourceService } from './content-source.service';
import { SourceEvent, SourceFacets } from './content-source.model';
import {
  EMPTY_POOL_FILTERS,
  EventPoolFilters,
  appendPage,
  eventPoolQuery,
  hasPoolFilters,
} from './source-event-pool-state';
import { SourceEventTable } from './source-event-table';
import { ToastService } from '../shared/toast/toast.service';
import {
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  DateInputComponent,
  MultiSelectComponent,
  SFieldComponent,
  SelectOption,
  SwitchComponent,
} from '../ui';

const EMPTY_FACETS: SourceFacets = { venues: [], genres: [] };

/**
 * Event pool of one source with venue, genre and date filters, paged with
 * "load more". Venues are canonical names: a filter on `Hirsch` also finds
 * the events the site lists as `Der Hirsch` once that alias exists.
 * Bump `reload` to load the first page again (after a sync or alias change).
 */
@Component({
  selector: 'app-source-event-pool',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnComponent,
    CardComponent,
    CardHeadComponent,
    DateInputComponent,
    FormsModule,
    MultiSelectComponent,
    SFieldComponent,
    SourceEventTable,
    SwitchComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-card *transloco="let t">
      <mns-card-head
        [title]="t('sources.events.title')"
        [sub]="t('sources.events.count', { count: total() })"
        icon="Calendar"
      >
        <div slot="right" class="flex items-center gap-2 text-[13px] text-muted">
          <span>{{ t('sources.events.includeGone') }}</span>
          <mns-switch
            [checked]="filters().includeGone"
            (toggled)="setFilters({ includeGone: $event })"
          />
        </div>
      </mns-card-head>

      <div class="pool-filters mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <mns-sfield [label]="t('sources.events.venue')">
          <mns-multi-select
            class="pool-venues"
            [options]="venueOptions()"
            [values]="filters().venues"
            [placeholder]="t('sources.events.allVenues')"
            [ariaLabel]="t('sources.events.venue')"
            (changed)="setFilters({ venues: $event })"
          />
        </mns-sfield>
        <mns-sfield [label]="t('sources.events.genres')">
          <mns-multi-select
            class="pool-genres"
            [options]="genreOptions()"
            [values]="filters().genres"
            [placeholder]="t('sources.events.allGenres')"
            [ariaLabel]="t('sources.events.genres')"
            (changed)="setFilters({ genres: $event })"
          />
        </mns-sfield>
        <mns-sfield [label]="t('sources.events.from')">
          <mns-date-input
            class="pool-from"
            [ngModel]="filters().from"
            (ngModelChange)="setFilters({ from: $event })"
          />
        </mns-sfield>
        <mns-sfield [label]="t('sources.events.to')">
          <mns-date-input
            class="pool-to"
            [ngModel]="filters().to"
            (ngModelChange)="setFilters({ to: $event })"
          />
        </mns-sfield>
      </div>

      @if (loading() && events().length === 0) {
        <p class="text-sm text-muted py-4">{{ t('sources.events.loading') }}</p>
      } @else if (events().length === 0) {
        <p class="text-sm text-muted py-4">
          {{ filtered() ? t('sources.events.noMatch') : t('sources.events.empty') }}
        </p>
      } @else {
        <app-source-event-table [events]="events()" />
        <div
          class="pool-footer mt-3 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-muted"
        >
          <span class="pool-showing">
            {{ t('sources.events.showing', { shown: events().length, total: total() }) }}
          </span>
          @if (hasMore()) {
            <mns-btn
              class="pool-more"
              variant="outline"
              size="sm"
              [disabled]="loading()"
              (mnsClick)="loadMore()"
              >{{
                loading() ? t('sources.events.loadingMore') : t('sources.events.loadMore')
              }}</mns-btn
            >
          }
        </div>
      }
    </mns-card>
  `,
  host: { class: 'block' },
})
export class SourceEventPool {
  private readonly service = inject(ContentSourceService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly orgId = input.required<string>();
  readonly sourceId = input.required<string>();
  /** Any change loads the first page and the facets again. */
  readonly reload = input(0);

  protected readonly filters = signal<EventPoolFilters>(EMPTY_POOL_FILTERS);
  protected readonly events = signal<SourceEvent[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  private readonly facets = signal<SourceFacets>(EMPTY_FACETS);

  protected readonly hasMore = computed(() => this.events().length < this.total());
  protected readonly filtered = computed(() => hasPoolFilters(this.filters()));
  protected readonly venueOptions = computed<SelectOption[]>(() =>
    this.facets().venues.map((venue) => ({ value: venue, label: venue })),
  );
  protected readonly genreOptions = computed<SelectOption[]>(() =>
    this.facets().genres.map((genre) => ({ value: genre, label: genre })),
  );

  private pageSub: Subscription | null = null;
  private facetSub: Subscription | null = null;

  constructor() {
    effect(() => {
      const orgId = this.orgId();
      const sourceId = this.sourceId();
      this.reload();
      untracked(() => {
        this.loadFacets(orgId, sourceId);
        this.loadPage(0);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.pageSub?.unsubscribe();
      this.facetSub?.unsubscribe();
    });
  }

  protected setFilters(change: Partial<EventPoolFilters>): void {
    this.filters.update((filters) => ({ ...filters, ...change }));
    this.loadPage(0);
  }

  protected loadMore(): void {
    if (this.hasMore() && !this.loading()) this.loadPage(this.events().length);
  }

  private loadFacets(orgId: string, sourceId: string): void {
    this.facetSub?.unsubscribe();
    this.facetSub = this.service
      .getFacets(orgId, [sourceId])
      .pipe(catchError(() => of(EMPTY_FACETS)))
      .subscribe((facets) => this.facets.set(facets));
  }

  /** Offset 0 replaces the table; a later offset appends to it. */
  private loadPage(offset: number): void {
    this.pageSub?.unsubscribe();
    this.loading.set(true);
    this.pageSub = this.service
      .getEvents(this.orgId(), this.sourceId(), eventPoolQuery(this.filters(), offset))
      .subscribe({
        next: (page) => {
          this.events.set(offset === 0 ? page.data : appendPage(this.events(), page.data));
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(this.transloco.translate('sources.toast.eventsFailed'));
        },
      });
  }
}
