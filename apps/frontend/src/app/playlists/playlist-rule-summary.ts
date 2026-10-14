import { PlaylistRule, RuleDateFrom, RuleDateTo } from './playlist.model';

const PART_SEPARATOR = ' · ';
const KEY = 'playlists.rule.summary.';

export type Translate = (key: string, params?: Record<string, unknown>) => string;

export interface RuleSummaryContext {
  translate: Translate;
  /** Formats an ISO date (`YYYY-MM-DD`) in the active locale. */
  formatDate: (iso: string) => string;
  /**
   * The rule's venues as the sources' aliases read them; the stored names
   * when absent. A rule may still name a spelling that got aliased later.
   */
  canonicalVenues?: (rule: PlaylistRule) => string[];
}

function genresPart(rule: PlaylistRule, { translate }: RuleSummaryContext): string {
  const { match, values } = rule.genres;
  if (values.length === 0) return translate(KEY + 'allGenres');
  // "all" requires every genre on the same event, which reads as "A & B".
  return values.join(match === 'all' ? ' & ' : ', ');
}

function venuesPart(
  rule: PlaylistRule,
  { translate, canonicalVenues }: RuleSummaryContext,
): string {
  if (rule.venues.length === 0) return translate(KEY + 'allVenues');
  return (canonicalVenues ? canonicalVenues(rule) : rule.venues).join(', ');
}

function fromText(from: RuleDateFrom, ctx: RuleSummaryContext): string {
  if (from.mode === 'fixed')
    return ctx.translate(KEY + 'fromDate', { date: ctx.formatDate(from.date) });
  if (from.mode === 'relativeDays') return ctx.translate(KEY + 'fromDays', { days: from.days });
  return ctx.translate(KEY + 'fromToday');
}

function toText(to: RuleDateTo, ctx: RuleSummaryContext): string | null {
  if (to.mode === 'fixed') return ctx.translate(KEY + 'toDate', { date: ctx.formatDate(to.date) });
  if (to.mode === 'relativeDays') return ctx.translate(KEY + 'toDays', { days: to.days });
  return null;
}

function datePart(rule: PlaylistRule, ctx: RuleSummaryContext): string {
  const to = toText(rule.dateTo, ctx);
  const from = fromText(rule.dateFrom, ctx);
  return to ? `${from} ${to}` : from;
}

/**
 * One line that says what a rule selects, e.g.
 * "Metal · Hirsch, Löwensaal, Z-Bau · ab heute bis 31.01.2027 · ohne abgesagte · max. 30".
 */
export function summariseRule(rule: PlaylistRule, ctx: RuleSummaryContext): string {
  const parts = [genresPart(rule, ctx), venuesPart(rule, ctx), datePart(rule, ctx)];
  if (rule.excludeCancelled) parts.push(ctx.translate(KEY + 'withoutCancelled'));
  if (rule.excludeSoldOut) parts.push(ctx.translate(KEY + 'withoutSoldOut'));
  parts.push(ctx.translate(KEY + 'limit', { limit: rule.limit }));
  return parts.join(PART_SEPARATOR);
}
