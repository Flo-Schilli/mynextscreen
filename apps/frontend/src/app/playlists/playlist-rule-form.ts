import { ContentSource, SLIDE_FORMATS, SlideFormat } from '../sources/content-source.model';
import {
  GenreMatchMode,
  PlaylistRule,
  RULE_BOUNDS,
  RuleDateFrom,
  RuleDateTo,
  RuleSortOrder,
  TransitionType,
} from './playlist.model';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DateFromMode = RuleDateFrom['mode'];
export type DateToMode = RuleDateTo['mode'];

/**
 * Flat, always-complete editing state of a playlist rule. The date bounds keep
 * the values of every mode, so switching a mode back and forth does not lose
 * what was typed; {@link toRule} keeps only the active one.
 */
export interface RuleFormState {
  sourceIds: string[];
  genreMatch: GenreMatchMode;
  genres: string[];
  venues: string[];
  dateFromMode: DateFromMode;
  dateFromDate: string;
  dateFromDays: number;
  dateToMode: DateToMode;
  dateToDate: string;
  dateToDays: number;
  excludeCancelled: boolean;
  excludeSoldOut: boolean;
  sort: RuleSortOrder;
  limit: number;
  graceHours: number;
  refreshIntervalMinutes: number;
  /** Empty until a source that renders a format is picked. */
  format: SlideFormat | '';
  itemDurationSeconds: number;
  transition: TransitionType;
  transitionDurationMs: number;
}

/** Translation keys under `playlists.rule.errors`, in display order. */
export type RuleFormError =
  | 'sourcesRequired'
  | 'tooManySources'
  | 'formatRequired'
  | 'dateFromInvalid'
  | 'dateToInvalid'
  | 'dateRangeInvalid'
  | 'numberOutOfRange';

const DEFAULT_RELATIVE_DAYS = 30;

export function defaultRuleForm(): RuleFormState {
  return {
    sourceIds: [],
    genreMatch: 'any',
    genres: [],
    venues: [],
    dateFromMode: 'today',
    dateFromDate: '',
    dateFromDays: 0,
    dateToMode: 'none',
    dateToDate: '',
    dateToDays: DEFAULT_RELATIVE_DAYS,
    excludeCancelled: true,
    excludeSoldOut: false,
    sort: 'date_asc',
    limit: RULE_BOUNDS.limit.default,
    graceHours: RULE_BOUNDS.graceHours.default,
    refreshIntervalMinutes: RULE_BOUNDS.refreshIntervalMinutes.default,
    format: '',
    itemDurationSeconds: RULE_BOUNDS.itemDurationSeconds.default,
    transition: 'fade',
    transitionDurationMs: RULE_BOUNDS.transitionDurationMs.default,
  };
}

export function ruleFormFrom(rule: PlaylistRule): RuleFormState {
  const base = defaultRuleForm();
  return {
    ...base,
    sourceIds: [...rule.sourceIds],
    genreMatch: rule.genres.match,
    genres: [...rule.genres.values],
    venues: [...rule.venues],
    dateFromMode: rule.dateFrom.mode,
    dateFromDate: rule.dateFrom.mode === 'fixed' ? rule.dateFrom.date : base.dateFromDate,
    dateFromDays: rule.dateFrom.mode === 'relativeDays' ? rule.dateFrom.days : base.dateFromDays,
    dateToMode: rule.dateTo.mode,
    dateToDate: rule.dateTo.mode === 'fixed' ? rule.dateTo.date : base.dateToDate,
    dateToDays: rule.dateTo.mode === 'relativeDays' ? rule.dateTo.days : base.dateToDays,
    excludeCancelled: rule.excludeCancelled,
    excludeSoldOut: rule.excludeSoldOut,
    sort: rule.sort,
    limit: rule.limit,
    graceHours: rule.graceHours,
    refreshIntervalMinutes: rule.refreshIntervalMinutes,
    format: rule.format,
    itemDurationSeconds: rule.itemDurationSeconds,
    transition: rule.transition,
    transitionDurationMs: rule.transitionDurationMs,
  };
}

function inRange(value: number, bounds: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= bounds.min && value <= bounds.max;
}

export function validateRuleForm(form: RuleFormState): RuleFormError[] {
  const errors: RuleFormError[] = [];
  if (form.sourceIds.length === 0) errors.push('sourcesRequired');
  if (form.sourceIds.length > RULE_BOUNDS.maxSources) errors.push('tooManySources');
  if (!form.format) errors.push('formatRequired');
  const fixedFrom = form.dateFromMode === 'fixed';
  const fixedTo = form.dateToMode === 'fixed';
  if (
    (fixedFrom && !ISO_DATE.test(form.dateFromDate)) ||
    (form.dateFromMode === 'relativeDays' && !inRange(form.dateFromDays, RULE_BOUNDS.relativeDays))
  ) {
    errors.push('dateFromInvalid');
  }
  if (
    (fixedTo && !ISO_DATE.test(form.dateToDate)) ||
    (form.dateToMode === 'relativeDays' && !inRange(form.dateToDays, RULE_BOUNDS.relativeDays))
  ) {
    errors.push('dateToInvalid');
  }
  if (fixedFrom && fixedTo && form.dateToDate < form.dateFromDate) {
    errors.push('dateRangeInvalid');
  }
  const numbersValid =
    inRange(form.limit, RULE_BOUNDS.limit) &&
    inRange(form.graceHours, RULE_BOUNDS.graceHours) &&
    inRange(form.refreshIntervalMinutes, RULE_BOUNDS.refreshIntervalMinutes) &&
    inRange(form.itemDurationSeconds, RULE_BOUNDS.itemDurationSeconds) &&
    inRange(form.transitionDurationMs, RULE_BOUNDS.transitionDurationMs);
  if (!numbersValid) errors.push('numberOutOfRange');
  return errors;
}

function toDateFrom(form: RuleFormState): RuleDateFrom {
  if (form.dateFromMode === 'fixed') return { mode: 'fixed', date: form.dateFromDate };
  if (form.dateFromMode === 'relativeDays')
    return { mode: 'relativeDays', days: form.dateFromDays };
  return { mode: 'today' };
}

function toDateTo(form: RuleFormState): RuleDateTo {
  if (form.dateToMode === 'fixed') return { mode: 'fixed', date: form.dateToDate };
  if (form.dateToMode === 'relativeDays') return { mode: 'relativeDays', days: form.dateToDays };
  return { mode: 'none' };
}

/** The rule to send, or null while the form is invalid. Never contains `null` fields. */
export function toRule(form: RuleFormState): PlaylistRule | null {
  if (validateRuleForm(form).length > 0 || !form.format) return null;
  return {
    sourceIds: [...form.sourceIds],
    genres: { match: form.genreMatch, values: [...form.genres] },
    venues: [...form.venues],
    dateFrom: toDateFrom(form),
    dateTo: toDateTo(form),
    excludeCancelled: form.excludeCancelled,
    excludeSoldOut: form.excludeSoldOut,
    sort: form.sort,
    limit: form.limit,
    graceHours: form.graceHours,
    refreshIntervalMinutes: form.refreshIntervalMinutes,
    format: form.format,
    itemDurationSeconds: form.itemDurationSeconds,
    transition: form.transition,
    transitionDurationMs: form.transitionDurationMs,
  };
}

/** Structural equality of two rules, for the dirty check. */
export function sameRule(a: PlaylistRule | null, b: PlaylistRule | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Drops source ids the organisation no longer has (a deleted source stays in a
 * stored rule). Returns the cleaned form and what was removed, so the editor
 * can tell the user instead of failing on save with `missingIds`.
 */
export function pruneUnknownSources(
  form: RuleFormState,
  knownIds: ReadonlySet<string>,
): { form: RuleFormState; removed: string[] } {
  const removed = form.sourceIds.filter((id) => !knownIds.has(id));
  if (removed.length === 0) return { form, removed };
  return { form: { ...form, sourceIds: form.sourceIds.filter((id) => knownIds.has(id)) }, removed };
}

/** Formats rendered by at least one of the picked sources, in canonical order. */
export function availableFormats(
  sources: readonly ContentSource[],
  sourceIds: readonly string[],
): SlideFormat[] {
  const picked = new Set(sourceIds);
  const rendered = new Set(sources.filter((s) => picked.has(s.id)).flatMap((s) => s.formats));
  return SLIDE_FORMATS.filter((format) => rendered.has(format));
}

/**
 * Keeps the format when one of the picked sources renders it, else falls back
 * to the first one they do render (or none). The backend rejects a format no
 * picked source renders.
 */
export function alignFormat(form: RuleFormState, formats: readonly SlideFormat[]): RuleFormState {
  if (form.format && formats.includes(form.format)) return form;
  const format = formats[0] ?? '';
  return format === form.format ? form : { ...form, format };
}
