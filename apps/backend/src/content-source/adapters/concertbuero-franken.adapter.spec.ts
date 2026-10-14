import { readFileSync } from 'fs';
import * as path from 'path';
import { ConcertbueroFrankenAdapter } from './concertbuero-franken.adapter';
import { InvalidSourceParamsError, type SourceFetcher } from './content-source-adapter.interface';
import { CBF_GENRES, genreListUrl, monthListUrl } from './concertbuero-franken.parser';

const fixture = (name: string): string =>
  readFileSync(path.join(__dirname, '__fixtures__', 'concertbuero-franken', name), 'utf8');

const EMPTY_PAGE = '<html><body></body></html>';

function fakeFetcher(pages: Record<string, string | Error>): SourceFetcher & {
  getText: jest.Mock;
} {
  return {
    getText: jest.fn(async (url: string) => {
      const page = pages[url];
      if (page instanceof Error) throw page;
      return page ?? EMPTY_PAGE;
    }),
    getBuffer: jest.fn(),
  };
}

describe('ConcertbueroFrankenAdapter', () => {
  const adapter = new ConcertbueroFrankenAdapter();
  const clawfingerUrl =
    'https://www.concertbuero-franken.de/konzert-details/clawfinger-2026-11-02.html';

  describe('validateParams', () => {
    it('applies the default when nothing is given', () => {
      expect(adapter.validateParams(undefined)).toEqual({ monthsAhead: 6 });
      expect(adapter.validateParams({})).toEqual({ monthsAhead: 6 });
    });

    it('accepts an integer in range', () => {
      expect(adapter.validateParams({ monthsAhead: 24 })).toEqual({ monthsAhead: 24 });
    });

    it.each([
      [{ monthsAhead: 0 }],
      [{ monthsAhead: 25 }],
      [{ monthsAhead: 1.5 }],
      [{ monthsAhead: '3' }],
    ])('rejects %j', (raw) => {
      expect(() => adapter.validateParams(raw)).toThrow(InvalidSourceParamsError);
    });

    it('rejects unknown keys and non-objects', () => {
      expect(() => adapter.validateParams({ location: 'x' })).toThrow(InvalidSourceParamsError);
      expect(() => adapter.validateParams([1])).toThrow(InvalidSourceParamsError);
      expect(() => adapter.validateParams('x')).toThrow(InvalidSourceParamsError);
    });

    it('describes its parameters for the dashboard form', () => {
      expect(adapter.paramsSchema).toEqual([
        expect.objectContaining({
          key: 'monthsAhead',
          type: 'integer',
          labelKey: 'sources.form.params.monthsAhead',
          min: 1,
          max: 24,
          default: 6,
        }),
      ]);
    });
  });

  describe('listEvents', () => {
    it('merges month listings with the genre index and removes duplicates', async () => {
      const fetcher = fakeFetcher({
        [monthListUrl('202611')]: fixture('month.html'),
        // The same month twice: every event appears twice and must be deduplicated.
        [monthListUrl('202612')]: fixture('month.html'),
        [genreListUrl('metal')]: fixture('month.html'),
      });

      const listing = await adapter.listEvents(
        { monthsAhead: 1 },
        { fetcher, today: '2026-11-01' },
      );

      expect(listing.listingComplete).toBe(true);
      expect(listing.genresComplete).toBe(true);
      expect(listing.warnings).toEqual([]);
      // 71 detail pages; Clawfinger and Napalm Death each have a second one
      // (`clawfinger-2-…`) for the same show, which counts once.
      expect(listing.events).toHaveLength(69);
      expect(listing.events.filter((e) => e.title === 'CLAWFINGER')).toHaveLength(1);
      expect(listing.events.filter((e) => e.title === 'NAPALM DEATH')).toHaveLength(1);
      const clawfinger = listing.events.find((e) => e.detailUrl === clawfingerUrl);
      expect(clawfinger).toEqual({
        externalId: `${clawfingerUrl}#2026-11-02`,
        title: 'CLAWFINGER',
        eventDate: '2026-11-02',
        startTime: '20:00',
        venue: 'Löwensaal',
        city: 'Nürnberg',
        genres: ['Metal'],
        statusLabels: ['LOCATION VERLEGT'],
        cancelled: false,
        soldOut: false,
        notes: [expect.stringContaining('Alter Veranstaltungsort: Hirsch')],
        detailUrl: clawfingerUrl,
      });
      expect(fetcher.getText).toHaveBeenCalledTimes(2 + CBF_GENRES.length);
    });

    it('follows genre pagination', async () => {
      const page2 = 'https://www.concertbuero-franken.de/pop.html?page_e354=1&page_e352=2';
      const fetcher = fakeFetcher({
        [genreListUrl('pop')]: fixture('genre-page1.html'),
        [page2]: fixture('genre-last.html'),
      });

      await adapter.listEvents({ monthsAhead: 0 }, { fetcher, today: '2026-11-01' });

      expect(fetcher.getText).toHaveBeenCalledWith(page2);
    });

    it('stops a genre after the page limit', async () => {
      const looping =
        '<nav class="pagination"><a class="next" href="rock.html?p=x">weiter</a></nav>';
      const fetcher = fakeFetcher({
        [genreListUrl('rock')]: looping,
        'https://www.concertbuero-franken.de/rock.html?p=x': looping,
      });

      const listing = await adapter.listEvents(
        { monthsAhead: 0 },
        { fetcher, today: '2026-11-01' },
      );

      expect(listing.genresComplete).toBe(false);
      expect(listing.warnings).toEqual([expect.stringContaining('Rock')]);
    });

    it('reports failed listing and genre pages instead of throwing', async () => {
      const fetcher = fakeFetcher({
        [monthListUrl('202611')]: new Error('HTTP 503'),
        [genreListUrl('metal')]: new Error('timeout'),
      });

      const listing = await adapter.listEvents(
        { monthsAhead: 0 },
        { fetcher, today: '2026-11-01' },
      );

      expect(listing.listingComplete).toBe(false);
      expect(listing.genresComplete).toBe(false);
      expect(listing.warnings).toEqual([
        expect.stringContaining('202611'),
        expect.stringContaining('Metal'),
      ]);
    });
  });

  describe('fetchDetails', () => {
    it('parses the detail page', async () => {
      const fetcher = fakeFetcher({ [clawfingerUrl]: fixture('detail.html') });
      const listing = await adapter.listEvents(
        { monthsAhead: 0 },
        {
          fetcher: fakeFetcher({ [monthListUrl('202611')]: fixture('month.html') }),
          today: '2026-11-01',
        },
      );
      const event = listing.events.find((e) => e.detailUrl === clawfingerUrl);

      const details = await adapter.fetchDetails(event!, { fetcher, today: '2026-11-01' });

      expect(details.priceCents).toBe(5100);
      expect(fetcher.getText).toHaveBeenCalledWith(clawfingerUrl);
    });

    it('returns empty details for an event without detail page', async () => {
      const fetcher = fakeFetcher({});

      const details = await adapter.fetchDetails(
        {
          externalId: 'x',
          title: 'X',
          eventDate: '2026-11-01',
          startTime: null,
          venue: 'V',
          city: null,
          genres: [],
          statusLabels: [],
          cancelled: false,
          soldOut: false,
          notes: [],
          detailUrl: null,
        },
        { fetcher, today: '2026-11-01' },
      );

      expect(details).toEqual({
        imageUrl: null,
        ticketUrl: null,
        priceCents: null,
        currency: null,
      });
      expect(fetcher.getText).not.toHaveBeenCalled();
    });
  });
});
