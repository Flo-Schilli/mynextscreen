import type { ContentSourceParams } from '../content-source.types';

/**
 * One adapter per website. The sync job asks it for the event listing first and
 * fetches details only for new or changed events, so a sync of an unchanged
 * site costs a handful of listing requests instead of one per event.
 */
export interface ContentSourceAdapter<P extends ContentSourceParams = ContentSourceParams> {
  /** Stable key stored on the source, e.g. `concertbuero-franken`. */
  readonly type: string;
  /** Display name for the dashboard. */
  readonly label: string;
  /** The only hosts this adapter may contact, redirects included. */
  readonly allowedHosts: readonly string[];
  /** Describes the parameters; the dashboard renders its form from it. */
  readonly paramsSchema: readonly ParamField[];

  /** Normalises raw input; throws {@link InvalidSourceParamsError} when invalid. */
  validateParams(raw: unknown): P;

  listEvents(params: P, context: AdapterContext): Promise<EventListing>;

  fetchDetails(event: ListedEvent, context: AdapterContext): Promise<EventDetails>;
}

export interface ParamField {
  key: string;
  type: 'integer';
  label: string;
  min: number;
  max: number;
  default: number;
}

/** What an adapter gets to do its work: an HTTP client bound to its host allowlist. */
export interface AdapterContext {
  fetcher: SourceFetcher;
  /** Local date in the organisation's time zone, `YYYY-MM-DD`. */
  today: string;
}

export interface SourceFetcher {
  getText(url: string): Promise<string>;
  getBuffer(url: string): Promise<Buffer>;
}

export interface ListedEvent {
  /** Stable per source; the detail URL for website adapters. */
  externalId: string;
  title: string;
  eventDate: string;
  startTime: string | null;
  venue: string;
  city: string | null;
  genres: string[];
  statusLabels: string[];
  cancelled: boolean;
  soldOut: boolean;
  notes: string[];
  detailUrl: string | null;
}

export interface EventDetails {
  imageUrl: string | null;
  ticketUrl: string | null;
  priceCents: number | null;
  currency: string | null;
}

export interface EventListing {
  events: ListedEvent[];
  /** False when a listing page failed: absent events must then not be marked gone. */
  listingComplete: boolean;
  /** False when a genre page failed: genres may be missing on some events. */
  genresComplete: boolean;
  warnings: string[];
}

export class InvalidSourceParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSourceParamsError';
  }
}
