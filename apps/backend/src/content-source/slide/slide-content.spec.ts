import {
  badgeFor,
  buildSlideContent,
  computeRenderHash,
  formatDateLabel,
  parseSlideFormat,
  qrUrlFor,
  type SlideEventInput,
} from './slide-content';
import type { SlideStyle } from '../content-source.types';

const EVENT: SlideEventInput = {
  title: 'Die Ärzte',
  eventDate: '2026-10-10',
  venue: 'Löwensaal',
  statusLabels: [],
  cancelled: false,
  soldOut: false,
  ticketUrl: 'https://tickets.example.org/1',
};

const STYLE: SlideStyle = { background: 'black', accentColor: '#E30613' };

describe('slide content', () => {
  it('formats the date with a German weekday', () => {
    expect(formatDateLabel('2026-10-10')).toBe('Sa, 10.10.2026');
    expect(formatDateLabel('2026-11-02')).toBe('Mo, 02.11.2026');
  });

  it('parses formats into dimensions', () => {
    expect(parseSlideFormat('1080x1920')).toEqual({ width: 1080, height: 1920 });
  });

  it('builds the displayed strings', () => {
    expect(buildSlideContent(EVENT)).toEqual({
      title: 'DIE ÄRZTE',
      metaLine: 'Sa, 10.10.2026 • Löwensaal',
      badge: null,
      qrUrl: 'https://tickets.example.org/1',
    });
  });

  it.each<[Partial<SlideEventInput>, string | null]>([
    [{}, null],
    [{ soldOut: true }, 'AUSVERKAUFT'],
    [{ statusLabels: ['AUSVERKAUFT'] }, 'AUSVERKAUFT'],
    [{ statusLabels: ['LOCATION VERLEGT'] }, 'VERLEGT'],
    [{ statusLabels: ['NEUER TERMIN', 'AUSVERKAUFT'] }, 'NEUER TERMIN'],
    [{ cancelled: true, soldOut: true }, 'ABGESAGT'],
    [{ statusLabels: ['ABGESAGT'] }, 'ABGESAGT'],
    [{ statusLabels: ['ZUSATZKONZERT'] }, null],
  ])('badge for %j is %s', (patch, expected) => {
    expect(badgeFor({ ...EVENT, ...patch })).toBe(expected);
  });

  it.each<[Partial<SlideEventInput>, string | null]>([
    [{}, 'https://tickets.example.org/1'],
    [{ soldOut: true }, null],
    [{ cancelled: true }, null],
    [{ ticketUrl: null }, null],
    [{ ticketUrl: 'javascript:alert(1)' }, null],
  ])('QR url for %j is %s', (patch, expected) => {
    expect(qrUrlFor({ ...EVENT, ...patch })).toBe(expected);
  });

  describe('computeRenderHash', () => {
    const content = buildSlideContent(EVENT);
    const base = computeRenderHash(content, 'https://img/1.jpg', '1920x1080', STYLE);

    it('is stable and ignores accent colour case', () => {
      expect(
        computeRenderHash(content, 'https://img/1.jpg', '1920x1080', {
          ...STYLE,
          accentColor: '#e30613',
        }),
      ).toBe(base);
    });

    it('changes with content, image, format and style', () => {
      const variants = [
        computeRenderHash(
          { ...content, badge: 'ABGESAGT' },
          'https://img/1.jpg',
          '1920x1080',
          STYLE,
        ),
        computeRenderHash(content, 'https://img/2.jpg', '1920x1080', STYLE),
        computeRenderHash(content, 'https://img/1.jpg', '1080x1920', STYLE),
        computeRenderHash(content, 'https://img/1.jpg', '1920x1080', {
          ...STYLE,
          background: 'blur',
        }),
      ];
      expect(new Set([base, ...variants]).size).toBe(5);
    });
  });
});
