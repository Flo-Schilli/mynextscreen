import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import {
  Playlist,
  PlaylistRule,
  RULE_BOUNDS,
  RuleSortOrder,
  TRANSITION_OPTIONS,
  TransitionType,
} from './playlist.model';
import { PlaylistService } from './playlist.service';
import {
  DateFromMode,
  DateToMode,
  RuleFormState,
  alignFormat,
  availableFormats,
  defaultRuleForm,
  pruneUnknownSources,
  ruleFormFrom,
  sameRule,
  toRule,
  validateRuleForm,
} from './playlist-rule-form';
import { summariseRule } from './playlist-rule-summary';
import { PlaylistRulePreview, RulePreviewState } from './playlist-rule-preview';
import { ContentSourceService } from '../sources/content-source.service';
import { canonicalRuleVenues } from '../sources/venue-alias-state';
import { ContentSource, SourceFacets } from '../sources/content-source.model';
import { formatLabel } from '../sources/source-form-state';
import { LanguageService } from '../i18n/language.service';
import { formatIsoDate } from '../i18n/locale-date-input';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';
import {
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  DateInputComponent,
  MultiSelectComponent,
  SelectComponent,
  SelectOption,
  SFieldComponent,
  StepperComponent,
  ToggleRowComponent,
} from '../ui';

/** Wait this long after the last edit before asking the server for a preview. */
export const PREVIEW_DEBOUNCE_MS = 400;

const DATE_FROM_MODES: readonly DateFromMode[] = ['today', 'fixed', 'relativeDays'];
const DATE_TO_MODES: readonly DateToMode[] = ['none', 'fixed', 'relativeDays'];
const SORT_ORDERS: readonly RuleSortOrder[] = ['date_asc', 'date_desc'];
const EMPTY_FACETS: SourceFacets = { venues: [], genres: [] };

/** `null` while loading, `[]` also when loading failed (then `failed` is set). */
interface SourcesState {
  sources: ContentSource[] | null;
  failed: boolean;
}

/**
 * Rule editor of a dynamic playlist, shown by the playlist editor in place of
 * the drag-and-drop sequence. Holds the editing state (seeded from the stored
 * rule, with deleted sources pruned), loads sources and facets, and shows a
 * debounced live preview of what the rule selects. Saving is emitted; the
 * parent persists it. Viewers get the summary only.
 */
@Component({
  selector: 'app-playlist-rule-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LocaleDatePipe,
    BtnComponent,
    CardComponent,
    CardHeadComponent,
    DateInputComponent,
    MultiSelectComponent,
    PlaylistRulePreview,
    SelectComponent,
    SFieldComponent,
    StepperComponent,
    ToggleRowComponent,
    TranslocoDirective,
  ],
  templateUrl: './playlist-rule-editor.html',
  host: { class: 'block' },
})
export class PlaylistRuleEditor {
  private readonly playlistService = inject(PlaylistService);
  private readonly sourceService = inject(ContentSourceService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly playlist = input.required<Playlist>();
  readonly orgId = input.required<string>();
  readonly canEdit = input(false);
  readonly saving = input(false);

  readonly save = output<PlaylistRule>();

  protected readonly bounds = RULE_BOUNDS;

  /** Reloaded per playlist object, so a save or reload also sees deleted sources. */
  private readonly sourcesState = toSignal(
    combineLatest([toObservable(this.orgId), toObservable(this.playlist)]).pipe(
      switchMap(([orgId]) =>
        this.sourceService.getAll(orgId).pipe(
          map((sources): SourcesState => ({ sources, failed: false })),
          catchError(() => of<SourcesState>({ sources: [], failed: true })),
          startWith<SourcesState>({ sources: null, failed: false }),
        ),
      ),
    ),
    { initialValue: { sources: null, failed: false } satisfies SourcesState },
  );
  protected readonly sources = computed(() => this.sourcesState().sources ?? []);
  protected readonly sourcesFailed = computed(() => this.sourcesState().failed);

  private readonly storedRule = computed(() => this.playlist().rule ?? null);

  /** The stored rule as form state, minus sources that no longer exist. */
  private readonly seed = computed(() => {
    const rule = this.storedRule();
    const base = rule ? ruleFormFrom(rule) : defaultRuleForm();
    const sources = this.sourcesState().sources;
    if (!sources) return { form: base, removed: [] as string[] };
    const pruned = pruneUnknownSources(base, new Set(sources.map((s) => s.id)));
    const formats = availableFormats(sources, pruned.form.sourceIds);
    return { form: alignFormat(pruned.form, formats), removed: pruned.removed };
  });

  protected readonly form = linkedSignal<RuleFormState>(() => this.seed().form);
  protected readonly removedSources = computed(() => this.seed().removed);

  protected readonly errors = computed(() => validateRuleForm(this.form()));
  protected readonly rule = computed(() => toRule(this.form()));
  protected readonly dirty = computed(() => !sameRule(this.rule(), this.storedRule()));

  /** What the edited rule does, or the stored one while the form is incomplete. */
  protected readonly summary = computed(() => {
    const rule = this.rule() ?? this.storedRule();
    if (!rule) return '';
    const locale = this.language.locale();
    return summariseRule(rule, {
      translate: (key, params) => this.transloco.translate(key, params),
      formatDate: (iso) => formatIsoDate(iso, locale) || iso,
      canonicalVenues: (r) => canonicalRuleVenues(r.venues, r.sourceIds, this.sources()),
    });
  });

  private readonly facets = toSignal(
    toObservable(computed(() => (this.canEdit() ? this.form().sourceIds.join(',') : null))).pipe(
      distinctUntilChanged(),
      switchMap((ids) =>
        ids === null || ids === ''
          ? of(EMPTY_FACETS)
          : this.sourceService
              .getFacets(this.orgId(), ids.split(','))
              .pipe(catchError(() => of(EMPTY_FACETS))),
      ),
    ),
    { initialValue: EMPTY_FACETS },
  );

  /** Debounced live preview; only editors may call the preview endpoint. */
  protected readonly preview = toSignal(
    toObservable(computed(() => (this.canEdit() ? this.rule() : null))).pipe(
      debounceTime(PREVIEW_DEBOUNCE_MS),
      distinctUntilChanged(sameRule),
      switchMap((rule) => this.previewOf(rule)),
    ),
    { initialValue: { status: 'invalid' } satisfies RulePreviewState as RulePreviewState },
  );

  protected readonly sourceOptions = computed<SelectOption[]>(() =>
    this.sources().map((s) => ({ value: s.id, label: s.name })),
  );
  protected readonly genreOptions = computed<SelectOption[]>(() =>
    this.facets().genres.map((g) => ({ value: g, label: g })),
  );
  protected readonly venueOptions = computed<SelectOption[]>(() =>
    this.facets().venues.map((v) => ({ value: v, label: v })),
  );
  protected readonly formatOptions = computed<SelectOption[]>(() =>
    availableFormats(this.sources(), this.form().sourceIds).map((f) => ({
      value: f,
      label: formatLabel(f),
    })),
  );
  protected readonly genreMatchOptions = computed<SelectOption[]>(() =>
    (['any', 'all'] as const).map((m) => ({
      value: m,
      label: this.transloco.translate('playlists.rule.genreMatch.' + m),
    })),
  );
  protected readonly dateFromOptions = computed<SelectOption[]>(() =>
    this.modeOptions(DATE_FROM_MODES, 'dateFromMode'),
  );
  protected readonly dateToOptions = computed<SelectOption[]>(() =>
    this.modeOptions(DATE_TO_MODES, 'dateToMode'),
  );
  protected readonly sortOptions = computed<SelectOption[]>(() =>
    this.modeOptions(SORT_ORDERS, 'sort'),
  );
  protected readonly transitionOptions = computed<SelectOption[]>(() =>
    TRANSITION_OPTIONS.map((o) => ({
      value: o.value,
      label: this.transloco.translate('playlists.transition.' + o.value),
    })),
  );

  patch(change: Partial<RuleFormState>): void {
    this.form.update((form) => ({ ...form, ...change }));
  }

  /** Picking sources also keeps the format one of those they render. */
  setSources(sourceIds: string[]): void {
    const formats = availableFormats(this.sources(), sourceIds);
    this.form.update((form) => alignFormat({ ...form, sourceIds }, formats));
  }

  protected setGenreMatch(value: string): void {
    if (value === 'any' || value === 'all') this.patch({ genreMatch: value });
  }

  protected setDateFromMode(value: string): void {
    const mode = DATE_FROM_MODES.find((m) => m === value);
    if (mode) this.patch({ dateFromMode: mode });
  }

  protected setDateToMode(value: string): void {
    const mode = DATE_TO_MODES.find((m) => m === value);
    if (mode) this.patch({ dateToMode: mode });
  }

  protected setSort(value: string): void {
    const sort = SORT_ORDERS.find((s) => s === value);
    if (sort) this.patch({ sort });
  }

  protected setFormat(value: string): void {
    const format = availableFormats(this.sources(), this.form().sourceIds).find((f) => f === value);
    if (format) this.patch({ format });
  }

  protected setTransition(value: string): void {
    const transition = TRANSITION_OPTIONS.find((o) => o.value === value)?.value;
    if (transition) this.patch({ transition: transition as TransitionType });
  }

  protected setDays(field: 'dateFromDays' | 'dateToDays', raw: string): void {
    const days = raw.trim() === '' ? Number.NaN : Number(raw);
    this.patch({ [field]: days });
  }

  protected discard(): void {
    this.form.set(this.seed().form);
  }

  submit(): void {
    const rule = this.rule();
    if (rule && this.canEdit()) this.save.emit(rule);
  }

  private previewOf(rule: PlaylistRule | null): Observable<RulePreviewState> {
    if (!rule) return of({ status: 'invalid' });
    return this.playlistService.previewRule(this.orgId(), rule).pipe(
      map((result): RulePreviewState => ({ status: 'ready', result })),
      catchError(() => of<RulePreviewState>({ status: 'failed' })),
      startWith<RulePreviewState>({ status: 'loading' }),
    );
  }

  private modeOptions(values: readonly string[], group: string): SelectOption[] {
    return values.map((v) => ({
      value: v,
      label: this.transloco.translate(`playlists.rule.${group}.${v}`),
    }));
  }
}
