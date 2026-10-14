import { readFileSync } from 'fs';
import * as path from 'path';
import {
  CBF_GENRES,
  buildGenreIndex,
  monthsInRange,
  parseEventDetails,
  parseEventList,
  parseNextPageUrl,
} from './concertbuero-franken.parser';

const fixture = (name: string): string =>
  readFileSync(path.join(__dirname, '__fixtures__', 'concertbuero-franken', name), 'utf8');

const monthHtml = fixture('month.html');
const detailHtml = fixture('detail.html');
const genrePage1Html = fixture('genre-page1.html');
const genreLastHtml = fixture('genre-last.html');

describe('concertbuero-franken parser', () => {
  describe('parseEventList', () => {
    it('reads every event of a month with complete fields', () => {
      const events = parseEventList(monthHtml);

      expect(events).toHaveLength(71);
      for (const event of events) {
        expect(event.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(event.title).toBeTruthy();
        expect(event.city).toBeTruthy();
        expect(event.venue).toBeTruthy();
        expect(event.detailUrl).toMatch(
          /^https:\/\/www\.concertbuero-franken\.de\/konzert-details\//,
        );
      }
      expect(events[2]).toEqual({
        title: 'CLAWFINGER',
        eventDate: '2026-11-02',
        startTime: '20:00',
        city: 'Nürnberg',
        venue: 'Löwensaal',
        statusLabels: ['LOCATION VERLEGT'],
        cancelled: false,
        soldOut: false,
        notes: [
          'Diese Veranstaltung wurde verlegt. Alter Veranstaltungsort: Hirsch • Neuer Veranstaltungsort: Löwensaal',
        ],
        detailUrl: 'https://www.concertbuero-franken.de/konzert-details/clawfinger-2026-11-02.html',
      });
    });

    it('flags cancelled and sold-out events', () => {
      const events = parseEventList(monthHtml);

      expect(events.filter((e) => e.cancelled).map((e) => e.title)).toEqual([
        'BONNIE TYLER',
        'ANY GIVEN DAY',
        'DIE UDO JÜRGENS STORY',
      ]);
      expect(events.filter((e) => e.soldOut)).toHaveLength(13);
      expect(events.every((e) => e.cancelled === e.statusLabels.includes('ABGESAGT'))).toBe(true);
    });

    it('skips blocks without link or date and falls back to the city as venue', () => {
      const html = `
        <div class="event"><h3 class="vee-listing-headline"><a href="x.html">NO DATE</a></h3></div>
        <div class="event"><time datetime="2026-10-10"></time></div>
        <div class="event">
          <h3 class="vee-listing-headline"><a href="konzert-details/a.html"> A  B </a></h3>
          <time datetime="2026-10-10"></time>
          <p class="info">Fürth</p>
        </div>`;

      expect(parseEventList(html)).toEqual([
        {
          title: 'A B',
          eventDate: '2026-10-10',
          startTime: null,
          city: '',
          venue: '',
          statusLabels: [],
          cancelled: false,
          soldOut: false,
          notes: [],
          detailUrl: 'https://www.concertbuero-franken.de/konzert-details/a.html',
        },
      ]);
    });

    it('reads genre listing pages with the same parser', () => {
      expect(parseEventList(genrePage1Html)).toHaveLength(48);
    });
  });

  describe('parseNextPageUrl', () => {
    it('follows the next link and ends on the last page', () => {
      expect(parseNextPageUrl(genrePage1Html, 'https://www.concertbuero-franken.de/pop.html')).toBe(
        'https://www.concertbuero-franken.de/pop.html?page_e354=1&page_e352=2',
      );
      expect(
        parseNextPageUrl(genreLastHtml, 'https://www.concertbuero-franken.de/metal.html'),
      ).toBeNull();
    });
  });

  describe('parseEventDetails', () => {
    it('reads image, ticket link and price from JSON-LD', () => {
      expect(parseEventDetails(detailHtml)).toEqual({
        imageUrl:
          'https://www.concertbuero-franken.de/files/cbf/veranstaltungen/bilder/2026/A/ASP_c_Heilemania_900.jpg',
        ticketUrl:
          'https://www.eventim.de/noapp/event/asp-mehr-denn-je-loewensaal-20458443/?affiliate=CBF&utm_campaign=concertbuero&utm_source=cbf&utm_medium=dp',
        priceCents: 5100,
        currency: 'EUR',
      });
    });

    it('returns empty details for a page without data', () => {
      expect(parseEventDetails('<p>nichts</p>')).toEqual({
        imageUrl: null,
        ticketUrl: null,
        priceCents: null,
        currency: null,
      });
    });

    it('falls back to the lightbox link for the image', () => {
      const html =
        '<figure class="image_container"><a href="files/x/Foo_900.jpg" data-lightbox="l"></a></figure>';

      expect(parseEventDetails(html).imageUrl).toBe(
        'https://www.concertbuero-franken.de/files/x/Foo_900.jpg',
      );
    });

    it('skips invalid JSON-LD blocks and reads offers given as an array', () => {
      const html = `
        <script type="application/ld+json">{ broken</script>
        <script type="application/ld+json">{"@type":"Organization"}</script>
        <script type="application/ld+json">{"@type":"Event","offers":[{"url":"https://t.example/a?x&#61;1&amp;y=2","price":"19.9","priceCurrency":"EUR"}]}</script>`;

      expect(parseEventDetails(html)).toEqual({
        imageUrl: null,
        ticketUrl: 'https://t.example/a?x=1&y=2',
        priceCents: 1990,
        currency: 'EUR',
      });
    });
  });

  describe('buildGenreIndex', () => {
    const url = (slug: string): string =>
      `https://www.concertbuero-franken.de/konzert-details/${slug}.html`;

    it('collects multiple genres per event in menu order without duplicates', () => {
      const index = buildGenreIndex([
        { genre: 'Pop', detailUrls: [url('a'), url('b')] },
        { genre: 'Metal', detailUrls: [url('a')] },
        { genre: 'Hip-Hop', detailUrls: [url('a'), url('a')] },
      ]);

      expect(index.get(url('a'))).toEqual(['Hip-Hop', 'Metal', 'Pop']);
      expect(index.get(url('b'))).toEqual(['Pop']);
      expect(index.get(url('c'))).toBeUndefined();
    });

    it('has unique genre slugs', () => {
      expect(new Set(CBF_GENRES.map((g) => g.slug)).size).toBe(CBF_GENRES.length);
    });
  });

  describe('monthsInRange', () => {
    it('spans the year boundary', () => {
      expect(monthsInRange('2026-11-15', 3)).toEqual(['202611', '202612', '202701', '202702']);
    });

    it('returns only the current month for zero months ahead', () => {
      expect(monthsInRange('2026-10-10', 0)).toEqual(['202610']);
    });
  });
});
