import { createHash } from 'crypto';
import type { SlideFormat, SlideStyle } from '../content-source.types';

/** Bump when the rendered look changes, so every slide is re-rendered once. */
export const RENDERER_VERSION = 2;

/** Everything a slide shows, already reduced to display strings. */
export interface SlideContent {
  /** Upper-cased artist or event title. */
  title: string;
  /** `Sa, 10.10.2026 • Löwensaal` */
  metaLine: string;
  /** Status badges, top to bottom; empty when the event needs none. */
  badges: readonly string[];
  /** Ticket link for the QR code, null when no code should be shown. */
  qrUrl: string | null;
}

/** The event fields that influence a slide. */
export interface SlideEventInput {
  title: string;
  eventDate: string;
  venue: string;
  statusLabels: readonly string[];
  cancelled: boolean;
  soldOut: boolean;
  ticketUrl: string | null;
}

export interface SlideDimensions {
  width: number;
  height: number;
}

const weekdayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' });

/** `2026-10-10` → `Sa, 10.10.2026` */
export function formatDateLabel(isoDate: string): string {
  const weekday = weekdayFormatter.format(new Date(`${isoDate}T00:00:00Z`)).replace('.', '');
  const [year, month, day] = isoDate.split('-');
  return `${weekday}, ${day}.${month}.${year}`;
}

export function parseSlideFormat(format: SlideFormat): SlideDimensions {
  const [width, height] = format.split('x').map(Number);
  return { width, height };
}

/**
 * The badges a slide shows, in display order. A cancellation makes every
 * other status irrelevant and stands alone; otherwise all that apply are
 * stacked as `VERLEGT`, `NEUER TERMIN`, `AUSVERKAUFT`. Relocation labels
 * such as `LOCATION VERLEGT` are shortened to `VERLEGT`.
 */
export function badgesFor(event: SlideEventInput): string[] {
  const labels = new Set(event.statusLabels);
  if (event.cancelled || labels.has('ABGESAGT')) return ['ABGESAGT'];
  const relocated = [...labels].some((label) => label.includes('VERLEGT'));
  const rescheduled = labels.has('NEUER TERMIN');
  const soldOut = event.soldOut || labels.has('AUSVERKAUFT');
  return [
    ...(relocated ? ['VERLEGT'] : []),
    ...(rescheduled ? ['NEUER TERMIN'] : []),
    ...(soldOut ? ['AUSVERKAUFT'] : []),
  ];
}

/** No QR code for events nobody can buy tickets for, or without a web link. */
export function qrUrlFor(event: SlideEventInput): string | null {
  if (event.cancelled || event.soldOut || !event.ticketUrl) {
    return null;
  }
  return /^https?:\/\//i.test(event.ticketUrl) ? event.ticketUrl : null;
}

export function buildSlideContent(event: SlideEventInput): SlideContent {
  return {
    title: event.title.toLocaleUpperCase('de-DE'),
    metaLine: `${formatDateLabel(event.eventDate)} • ${event.venue}`,
    badges: badgesFor(event),
    qrUrl: qrUrlFor(event),
  };
}

/** Changes whenever anything visible on the slide would change. */
export function computeRenderHash(
  content: SlideContent,
  imageUrl: string | null,
  format: SlideFormat,
  style: SlideStyle,
): string {
  const payload = JSON.stringify({
    version: RENDERER_VERSION,
    content,
    imageUrl,
    format,
    background: style.background,
    accentColor: style.accentColor.toLowerCase(),
  });
  return createHash('sha256').update(payload).digest('hex');
}
