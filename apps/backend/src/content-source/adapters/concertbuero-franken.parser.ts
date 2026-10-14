import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { EventDetails } from './content-source-adapter.interface';

/**
 * Pure HTML parsers for concertbuero-franken.de. Kept apart from the adapter so
 * they are tested against stored page snapshots without any network.
 */

export const CBF_BASE_URL = 'https://www.concertbuero-franken.de/';

/** Genre pages from the "Konzerte" menu, in menu order. */
export const CBF_GENRES: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: 'clubbing-electro', label: 'Clubbing/Electro' },
  { slug: 'folk-country', label: 'Folk/Country' },
  { slug: 'hip-hop', label: 'Hip-Hop' },
  { slug: 'indie-alternative', label: 'Indie/Alternative' },
  { slug: 'jazz-blues-klassik', label: 'Jazz/Blues/Klassik' },
  { slug: 'kabarett-comedy-liedermacher', label: 'Kabarett/Comedy/Liedermacher' },
  { slug: 'metal', label: 'Metal' },
  { slug: 'musicals-shows', label: 'Musicals/Shows' },
  { slug: 'pop', label: 'Pop' },
  { slug: 'punkrock-hardcore', label: 'Punkrock/Hardcore' },
  { slug: 'rock', label: 'Rock' },
];

const STATUS_CANCELLED = 'ABGESAGT';
const STATUS_SOLD_OUT = 'AUSVERKAUFT';
const CENTS_PER_UNIT = 100;

/** One event as a month or genre listing shows it. */
export interface CbfListedEvent {
  title: string;
  eventDate: string;
  startTime: string | null;
  city: string;
  venue: string;
  statusLabels: string[];
  cancelled: boolean;
  soldOut: boolean;
  notes: string[];
  detailUrl: string;
}

export function monthListUrl(month: string): string {
  return new URL(`konzerte-nach-monat.html?month=${month}`, CBF_BASE_URL).href;
}

export function genreListUrl(slug: string): string {
  return new URL(`${slug}.html`, CBF_BASE_URL).href;
}

/** Months (`YYYYMM`) from the month of `fromIsoDate` through `monthsAhead` months later. */
export function monthsInRange(fromIsoDate: string, monthsAhead: number): string[] {
  const [year, month] = fromIsoDate.split('-').map(Number);
  const start = year * 12 + (month - 1);
  return Array.from({ length: monthsAhead + 1 }, (_, offset) => {
    const key = start + offset;
    return `${Math.floor(key / 12)}${String((key % 12) + 1).padStart(2, '0')}`;
  });
}

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Parses an event listing (month or genre page). Blocks without link or date are skipped. */
export function parseEventList(html: string): CbfListedEvent[] {
  const $ = cheerio.load(html);
  const events: CbfListedEvent[] = [];
  $('div.event').each((_, element) => {
    const block = $(element);
    const href = block.find('h3.vee-listing-headline a').first().attr('href');
    const datetime = block.find('time[datetime]').attr('datetime') ?? '';
    if (!href || !/^\d{4}-\d{2}-\d{2}/.test(datetime)) {
      return;
    }

    const place = block
      .find('p.info')
      .toArray()
      .map((info) => normalize($(info).text()))
      .find((text) => text.includes('•'));
    const statusLabels = block
      .find('.eventListProperties > div')
      .toArray()
      .map((flag) => normalize($(flag).text()).toUpperCase())
      .filter(Boolean);
    // Relocation hints live in abbr tooltips, partly inside HTML comments.
    const notes = [
      ...(block.find('.eventListProperties').html() ?? '').matchAll(/title="([^"]+)"/g),
    ].map(([, title]) => normalize(cheerio.load(title, null, false).text()));
    const [city = '', ...venueParts] = (place ?? '').split('•').map(normalize);

    events.push({
      title: normalize(block.find('h3.vee-listing-headline a').first().text()),
      eventDate: datetime.slice(0, 10),
      startTime: /T(\d{2}:\d{2})/.exec(datetime)?.[1] ?? null,
      city,
      venue: venueParts.join(' • ') || city,
      statusLabels,
      cancelled: statusLabels.includes(STATUS_CANCELLED),
      soldOut: statusLabels.includes(STATUS_SOLD_OUT),
      notes: [...new Set(notes)],
      detailUrl: new URL(href, CBF_BASE_URL).href,
    });
  });
  return events;
}

/** URL of the next listing page or null. The page parameter (`page_eNNN`) differs per genre. */
export function parseNextPageUrl(html: string, pageUrl: string): string | null {
  const href = cheerio.load(html)('nav.pagination a.next').first().attr('href');
  return href ? new URL(href, pageUrl).href : null;
}

// The JSON-LD carries HTML entities such as &#61; inside URLs.
const decodeEntities = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function findEventJsonLd($: CheerioAPI): JsonRecord | null {
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      // The site leaves raw line breaks inside strings, which JSON.parse rejects.
      const data: unknown = JSON.parse(
        $(script)
          .text()
          .replace(/[\r\n\t]+/g, ' '),
      );
      if (isRecord(data) && data['@type'] === 'Event') {
        return data;
      }
    } catch {
      // Invalid JSON-LD block: try the next one.
    }
  }
  return null;
}

function firstOffer(data: JsonRecord | null): JsonRecord | null {
  const offers = data?.offers;
  const offer: unknown = Array.isArray(offers) ? offers[0] : offers;
  return isRecord(offer) ? offer : null;
}

/** Image, ticket link and price of a detail page (JSON-LD, image fallback via lightbox link). */
export function parseEventDetails(html: string): EventDetails {
  const $ = cheerio.load(html);
  const data = findEventJsonLd($);
  const offer = firstOffer(data);
  const image =
    typeof data?.image === 'string'
      ? data.image
      : $('figure.image_container a[data-lightbox]').first().attr('href');
  const price = Number.parseFloat(String(offer?.price ?? ''));

  return {
    imageUrl: image ? new URL(image, CBF_BASE_URL).href : null,
    ticketUrl: typeof offer?.url === 'string' ? decodeEntities(offer.url) : null,
    priceCents: Number.isFinite(price) ? Math.round(price * CENTS_PER_UNIT) : null,
    currency: typeof offer?.priceCurrency === 'string' ? offer.priceCurrency : null,
  };
}

/** Map detail URL → genre labels (menu order, no duplicates). */
export function buildGenreIndex(
  listings: ReadonlyArray<{ genre: string; detailUrls: readonly string[] }>,
): Map<string, string[]> {
  const order = CBF_GENRES.map((genre) => genre.label);
  const index = new Map<string, Set<string>>();
  for (const { genre, detailUrls } of listings) {
    for (const url of detailUrls) {
      index.set(url, new Set([...(index.get(url) ?? []), genre]));
    }
  }
  const byMenuOrder = (a: string, b: string): number => order.indexOf(a) - order.indexOf(b);
  return new Map([...index].map(([url, genres]) => [url, [...genres].sort(byMenuOrder)]));
}
