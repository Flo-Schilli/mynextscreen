import { Injectable } from '@nestjs/common';
import {
  type AdapterContext,
  type ContentSourceAdapter,
  type EventDetails,
  type EventListing,
  type ListedEvent,
  type ParamField,
  InvalidSourceParamsError,
} from './content-source-adapter.interface';
import {
  CBF_GENRES,
  type CbfListedEvent,
  buildGenreIndex,
  genreListUrl,
  monthListUrl,
  monthsInRange,
  parseEventDetails,
  parseEventList,
  parseNextPageUrl,
} from './concertbuero-franken.parser';

// A type alias, not an interface: only aliases are assignable to the params index signature.
export type ConcertbueroFrankenParams = { monthsAhead: number };

const MONTHS_AHEAD_MIN = 1;
const MONTHS_AHEAD_MAX = 24;
const MONTHS_AHEAD_DEFAULT = 6;
const MAX_PAGES_PER_GENRE = 20;
const PARAM_KEYS = new Set(['monthsAhead']);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * concertbuero-franken.de: month listings carry status, notes and start time,
 * genre pages map events to genres, the detail page's JSON-LD has image, ticket
 * link and price.
 */
@Injectable()
export class ConcertbueroFrankenAdapter implements ContentSourceAdapter<ConcertbueroFrankenParams> {
  readonly type = 'concertbuero-franken';
  readonly label = 'Concertbüro Franken';
  readonly allowedHosts = ['www.concertbuero-franken.de', 'concertbuero-franken.de'] as const;
  readonly paramsSchema: readonly ParamField[] = [
    {
      key: 'monthsAhead',
      type: 'integer',
      label: 'Months ahead',
      min: MONTHS_AHEAD_MIN,
      max: MONTHS_AHEAD_MAX,
      default: MONTHS_AHEAD_DEFAULT,
    },
  ];

  validateParams(raw: unknown): ConcertbueroFrankenParams {
    if (raw === undefined || raw === null) {
      return { monthsAhead: MONTHS_AHEAD_DEFAULT };
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new InvalidSourceParamsError('params must be an object');
    }
    const entries = Object.entries(raw);
    const unknown = entries.map(([key]) => key).filter((key) => !PARAM_KEYS.has(key));
    if (unknown.length > 0) {
      throw new InvalidSourceParamsError(`Unknown parameter(s): ${unknown.join(', ')}`);
    }
    const value: unknown = (raw as Record<string, unknown>).monthsAhead ?? MONTHS_AHEAD_DEFAULT;
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < MONTHS_AHEAD_MIN ||
      value > MONTHS_AHEAD_MAX
    ) {
      throw new InvalidSourceParamsError(
        `monthsAhead must be an integer between ${MONTHS_AHEAD_MIN} and ${MONTHS_AHEAD_MAX}`,
      );
    }
    return { monthsAhead: value };
  }

  async listEvents(
    params: ConcertbueroFrankenParams,
    context: AdapterContext,
  ): Promise<EventListing> {
    const warnings: string[] = [];
    const byId = new Map<string, CbfListedEvent>();
    let listingComplete = true;

    for (const month of monthsInRange(context.today, params.monthsAhead)) {
      try {
        for (const event of parseEventList(await context.fetcher.getText(monthListUrl(month)))) {
          // The site lists some events twice; the first occurrence wins.
          const id = externalIdOf(event);
          if (!byId.has(id)) byId.set(id, event);
        }
      } catch (error) {
        listingComplete = false;
        warnings.push(`Month ${month} could not be loaded: ${errorMessage(error)}`);
      }
    }

    const genres = await this.fetchGenreIndex(context, warnings);
    const events: ListedEvent[] = [...byId.entries()].map(([externalId, event]) => ({
      externalId,
      title: event.title,
      eventDate: event.eventDate,
      startTime: event.startTime,
      venue: event.venue,
      city: event.city || null,
      genres: genres.index.get(event.detailUrl) ?? [],
      statusLabels: event.statusLabels,
      cancelled: event.cancelled,
      soldOut: event.soldOut,
      notes: event.notes,
      detailUrl: event.detailUrl,
    }));

    return { events, listingComplete, genresComplete: genres.complete, warnings };
  }

  async fetchDetails(event: ListedEvent, context: AdapterContext): Promise<EventDetails> {
    if (!event.detailUrl) {
      return { imageUrl: null, ticketUrl: null, priceCents: null, currency: null };
    }
    return parseEventDetails(await context.fetcher.getText(event.detailUrl));
  }

  private async fetchGenreIndex(
    context: AdapterContext,
    warnings: string[],
  ): Promise<{ index: Map<string, string[]>; complete: boolean }> {
    let complete = true;
    const listings: { genre: string; detailUrls: string[] }[] = [];
    for (const genre of CBF_GENRES) {
      const result = await this.fetchGenreDetailUrls(genre.slug, context);
      listings.push({ genre: genre.label, detailUrls: result.detailUrls });
      if (result.error) {
        complete = false;
        warnings.push(`Genre ${genre.label}: ${result.error}`);
      }
    }
    return { index: buildGenreIndex(listings), complete };
  }

  /** Detail URLs of a genre across all its pages. Pages read before an error are kept. */
  private async fetchGenreDetailUrls(
    slug: string,
    context: AdapterContext,
  ): Promise<{ detailUrls: string[]; error: string | null }> {
    const detailUrls: string[] = [];
    let pageUrl: string | null = genreListUrl(slug);
    for (let page = 0; pageUrl; page += 1) {
      if (page >= MAX_PAGES_PER_GENRE) {
        return { detailUrls, error: `more than ${MAX_PAGES_PER_GENRE} pages, rest ignored` };
      }
      try {
        const html = await context.fetcher.getText(pageUrl);
        detailUrls.push(...parseEventList(html).map((event) => event.detailUrl));
        pageUrl = parseNextPageUrl(html, pageUrl);
      } catch (error) {
        return { detailUrls, error: `page ${page + 1} failed: ${errorMessage(error)}` };
      }
    }
    return { detailUrls, error: null };
  }
}

/**
 * Detail URL plus date: a detail page can be reused for several dates of a tour
 * (e.g. `tokio-hotel.html`), so the URL alone does not identify one event.
 */
function externalIdOf(event: CbfListedEvent): string {
  return `${event.detailUrl}#${event.eventDate}`;
}
