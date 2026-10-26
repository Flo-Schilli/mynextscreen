import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ContentService } from '../content/content.service';
import { LanguageService } from '../i18n/language.service';
import { IconComponent } from '../ui';
import { ScheduleService } from './schedule.service';
import { ScheduleEntryPreview } from './schedule.model';

type PreviewState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; preview: ScheduleEntryPreview };

/** One row of the preview, whatever kind of playlist it came from. */
interface PreviewRow {
  key: string;
  thumbUrl: string;
  title: string;
  detail: string | null;
  genres: { name: string; matches: boolean }[];
}

/**
 * What a schedule entry's playlist shows right now: the events a dynamic
 * playlist selects, with their genres (those its genre filter asked for
 * highlighted), or the items of a static one. For an entry that plays a genre
 * group this is the narrowed variant, which no playlist list shows.
 */
@Component({
  selector: 'app-schedule-entry-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TranslocoDirective],
  template: `
    <section class="entry-preview" *transloco="let t">
      <h3 class="text-[12px] font-bold uppercase tracking-wide text-muted mb-2">
        {{ t('schedules.preview.title') }}
      </h3>
      @switch (state().status) {
        @case ('loading') {
          <p class="preview-loading text-[13px] text-muted py-2">
            {{ t('schedules.preview.loading') }}
          </p>
        }
        @case ('failed') {
          <p class="preview-failed text-[13px] text-offline py-2">
            {{ t('schedules.preview.failed') }}
          </p>
        }
        @case ('ready') {
          <p class="preview-summary text-[12.5px] text-muted mb-2">
            {{ t('schedules.preview.summary', { count: rows().length, playlist: playlistName() }) }}
            @if (filterGenres().length > 0) {
              · {{ t('schedules.preview.genres', { genres: filterGenres().join(', ') }) }}
            }
          </p>
          @if (rows().length === 0) {
            <p class="preview-empty text-[13px] text-muted py-2">
              {{ t('schedules.preview.empty') }}
            </p>
          } @else {
            <ul
              class="preview-items flex flex-col max-h-[45vh] overflow-y-auto -mx-1 px-1 divide-y divide-border"
            >
              @for (row of rows(); track row.key) {
                <li class="preview-item flex items-start gap-3 py-2">
                  <img
                    class="w-16 h-9 rounded object-cover bg-surface-3 flex-shrink-0"
                    [src]="row.thumbUrl"
                    alt=""
                    loading="lazy"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="preview-item-title text-[13px] font-semibold text-text truncate">
                      {{ row.title }}
                    </div>
                    @if (row.detail) {
                      <div class="text-[11.5px] text-muted truncate">{{ row.detail }}</div>
                    }
                    @if (row.genres.length > 0) {
                      <div class="flex flex-wrap gap-1 mt-1">
                        @for (genre of row.genres; track genre.name) {
                          <span
                            class="preview-genre inline-flex items-center gap-0.5 rounded px-1 text-[10.5px] font-semibold leading-[16px]"
                            [class.matches]="genre.matches"
                            [class.bg-accent-soft]="genre.matches"
                            [class.text-accent]="genre.matches"
                            [class.bg-surface-3]="!genre.matches"
                            [class.text-muted]="!genre.matches"
                          >
                            @if (genre.matches) {
                              <mns-icon name="Sparkle" [size]="9" />
                            }
                            {{ genre.name }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        }
      }
    </section>
  `,
})
export class ScheduleEntryPreviewComponent {
  readonly orgId = input.required<string>();
  readonly entryId = input.required<string>();

  private readonly schedules = inject(ScheduleService);
  private readonly content = inject(ContentService);
  private readonly language = inject(LanguageService);

  readonly state = toSignal(
    toObservable(computed(() => ({ orgId: this.orgId(), entryId: this.entryId() }))).pipe(
      switchMap(({ orgId, entryId }) =>
        this.schedules.getPreview(orgId, entryId).pipe(
          map((preview): PreviewState => ({ status: 'ready', preview })),
          startWith<PreviewState>({ status: 'loading' }),
          catchError(() => of<PreviewState>({ status: 'failed' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as PreviewState },
  );

  private readonly preview = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.preview : null;
  });

  readonly playlistName = computed(() => this.preview()?.playlistName ?? '');

  /** The genres the playlist's own filter selects; empty when it takes every genre. */
  readonly filterGenres = computed(() => {
    const preview = this.preview();
    return preview?.kind === 'dynamic' ? preview.genres : [];
  });

  readonly rows = computed<PreviewRow[]>(() => {
    const preview = this.preview();
    if (!preview) return [];
    if (preview.kind === 'static') {
      return preview.items.map((item, index) => ({
        key: `${item.contentId}#${index}`,
        thumbUrl: this.content.getThumbnailUrl(item.contentId, item.contentUpdatedAt),
        title: item.title,
        detail: null,
        genres: [],
      }));
    }
    const wanted = new Set(preview.genres);
    return preview.result.items.map((item) => ({
      key: item.sourceEventId,
      thumbUrl: this.content.getThumbnailUrl(item.contentId, item.contentUpdatedAt),
      title: item.title,
      detail: [this.formatDate(item.eventDate), item.startTime, item.venueCanonical]
        .filter(Boolean)
        .join(' · '),
      genres: item.genres.map((name) => ({ name, matches: wanted.has(name) })),
    }));
  });

  private formatDate(isoDate: string): string {
    return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(this.language.locale(), {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }
}
