import { createHash } from 'crypto';
import type { SlideFormat, SlideStyle } from '../content-source.types';

/** Bump when the rendered look changes, so every slide is re-rendered once. */
export const RENDERER_VERSION = 1;

/** Everything a slide shows, already reduced to display strings. */
export interface SlideContent {
  /** Upper-cased artist or event title. */
  title: string;
  /** `Sa, 10.10.2026 • Löwensaal` */
  metaLine: string;
  /** Status badge text, null when the event needs none. */
  badge: string | null;
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

/** Highest-priority badge, or null. Relocations are shortened to `VERLEGT`. */
export function badgeFor(event: SlideEventInput): string | null {
  const labels = new Set(event.statusLabels);
  if (event.cancelled || labels.has('ABGESAGT')) return 'ABGESAGT';
  if (labels.has('NEUER TERMIN')) return 'NEUER TERMIN';
  if ([...labels].some((label) => label.includes('VERLEGT'))) return 'VERLEGT';
  if (event.soldOut || labels.has('AUSVERKAUFT')) return 'AUSVERKAUFT';
  return null;
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
    badge: badgeFor(event),
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
