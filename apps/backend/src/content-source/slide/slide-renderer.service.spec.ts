import { sharp } from './sharp';
import {
  SlideRendererService,
  badgeRects,
  fitFontSize,
  qrPlateRect,
  type Rect,
} from './slide-renderer.service';
import type { SlideContent } from './slide-content';
import type { SlideStyle } from '../content-source.types';

const BLACK_STYLE: SlideStyle = { background: 'black', accentColor: '#00ff00' };
const BLUR_STYLE: SlideStyle = { background: 'blur', accentColor: '#00ff00' };

const PLAIN: SlideContent = {
  title: 'A & <B>',
  metaLine: 'Sa, 10.10.2026 • Löwensaal',
  badges: [],
  qrUrl: null,
};

const WITH_EXTRAS: SlideContent = {
  ...PLAIN,
  badges: ['AUSVERKAUFT'],
  qrUrl: 'https://tickets.example.org/event/1',
};

async function redImage(width = 900, height = 675): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#ff0000' } })
    .png()
    .toBuffer();
}

async function pixel(image: Buffer, left: number, top: number): Promise<number[]> {
  const data = await sharp(image).extract({ left, top, width: 1, height: 1 }).raw().toBuffer();
  return [data[0], data[1], data[2]];
}

/** Relocated and sold out at once, like MORPHEUZ in the E2E test. */
const STACKED: SlideContent = {
  ...PLAIN,
  title: 'MORPHEUZ',
  badges: ['VERLEGT', 'AUSVERKAUFT'],
};

const LANDSCAPE = { width: 1920, height: 1080 };
const PORTRAIT = { width: 1080, height: 1920 };

/** A point on the rect's left padding, clear of text and of rounded corners. */
const insideCorner = (rect: Rect | null | undefined): [number, number] => [
  rect!.left + 4,
  rect!.top + Math.round(rect!.height / 2),
];

describe('SlideRendererService', () => {
  const renderer = new SlideRendererService();

  it('renders a 1920x1080 JPEG with black bars and the image centred', async () => {
    const output = await renderer.render(await redImage(), PLAIN, '1920x1080', BLACK_STYLE);

    const meta = await sharp(output).metadata();
    expect({ width: meta.width, height: meta.height, format: meta.format }).toEqual({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    });
    const [r, g, b] = await pixel(output, 10, 10);
    expect(Math.max(r, g, b)).toBeLessThan(20);
    const center = await pixel(output, 960, 300);
    expect(center[0]).toBeGreaterThan(200);
    expect(center[1]).toBeLessThan(60);
  });

  it('renders portrait with the image on top at full width', async () => {
    const output = await renderer.render(await redImage(), PLAIN, '1080x1920', BLACK_STYLE);

    const meta = await sharp(output).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1920]);
    // 900x675 scaled to full width is 1080x810, flush with the top edge.
    const top = await pixel(output, 5, 20);
    expect(top[0]).toBeGreaterThan(200);
    const belowImage = await pixel(output, 1000, 1000);
    expect(belowImage[0]).toBeLessThan(40);
  });

  it('renders text with characters that XML 1.0 forbids', async () => {
    const content: SlideContent = {
      ...WITH_EXTRAS,
      title: 'ASP\u0001\u0008 & Friends\u000B',
      metaLine: 'Sa\u001F, 10.10.2026 \u000C• Löwensaal',
      badges: ['AUS\u0000VERKAUFT', 'NEUER\u0001 TERMIN'],
    };

    const output = await renderer.render(await redImage(), content, '1920x1080', BLACK_STYLE);

    expect((await sharp(output).metadata()).format).toBe('jpeg');
  });

  it('scales to 4K', async () => {
    const output = await renderer.render(await redImage(), WITH_EXTRAS, '3840x2160', BLACK_STYLE);

    const meta = await sharp(output).metadata();
    expect([meta.width, meta.height]).toEqual([3840, 2160]);
    const [x, y] = insideCorner(badgeRects({ width: 3840, height: 2160 }, WITH_EXTRAS.badges)[0]);
    const badge = await pixel(output, x, y);
    expect(badge[1]).toBeGreaterThan(200);
  });

  it('fills the bars with a blurred copy in blur style', async () => {
    const output = await renderer.render(await redImage(), PLAIN, '1920x1080', BLUR_STYLE);

    const [r, g, b] = await pixel(output, 10, 540);
    expect(r).toBeGreaterThan(60);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(40);
  });

  it('draws the badge in the accent colour and a QR plate when requested', async () => {
    const dims = { width: 1920, height: 1080 };
    const output = await renderer.render(await redImage(), WITH_EXTRAS, '1920x1080', BLACK_STYLE);

    const [bx, by] = insideCorner(badgeRects(dims, WITH_EXTRAS.badges)[0]);
    const badge = await pixel(output, bx, by);
    expect(badge[0]).toBeLessThan(60);
    expect(badge[1]).toBeGreaterThan(200);

    const [qx, qy] = insideCorner(qrPlateRect(dims, WITH_EXTRAS.qrUrl));
    const plate = await pixel(output, qx, qy);
    expect(Math.min(...plate)).toBeGreaterThan(220);
  });

  it('leaves badge and QR areas empty when there is nothing to show', async () => {
    const dims = { width: 1920, height: 1080 };
    const output = await renderer.render(await redImage(), PLAIN, '1920x1080', BLACK_STYLE);

    const [bx, by] = insideCorner(badgeRects(dims, ['AUSVERKAUFT'])[0]);
    expect((await pixel(output, bx, by))[1]).toBeLessThan(60);
    const [qx, qy] = insideCorner(qrPlateRect(dims, 'https://x.example'));
    expect(Math.min(...(await pixel(output, qx, qy)))).toBeLessThan(120);
  });

  it('renders without an image on black and falls back for an invalid accent', async () => {
    const output = await renderer.render(null, WITH_EXTRAS, '1080x1920', {
      background: 'blur',
      accentColor: 'red"/><script>',
    });

    const meta = await sharp(output).metadata();
    expect([meta.width, meta.height]).toEqual([1080, 1920]);
    expect(Math.max(...(await pixel(output, 10, 10)))).toBeLessThan(20);
    const [bx, by] = insideCorner(badgeRects({ width: 1080, height: 1920 }, WITH_EXTRAS.badges)[0]);
    const badge = await pixel(output, bx, by);
    expect(badge[0]).toBeGreaterThan(180);
  });

  it('uses dark badge text on a light accent', async () => {
    const output = await renderer.render(null, WITH_EXTRAS, '1920x1080', {
      background: 'black',
      accentColor: '#ffff00',
    });

    expect((await sharp(output).metadata()).format).toBe('jpeg');
  });

  it.each([
    ['landscape', '1920x1080', LANDSCAPE],
    ['portrait', '1080x1920', PORTRAIT],
  ] as const)('stacks every badge in the accent colour (%s)', async (_, format, dims) => {
    const output = await renderer.render(await redImage(), STACKED, format, BLACK_STYLE);

    const [first, second] = badgeRects(dims, STACKED.badges);
    for (const rect of [first, second]) {
      const [x, y] = insideCorner(rect);
      const badge = await pixel(output, x, y);
      expect(badge[0]).toBeLessThan(60);
      expect(badge[1]).toBeGreaterThan(200);
    }
    // The gap between the two badges shows the image, not the accent.
    const gapY = Math.round((first.top + first.height + second.top) / 2);
    const gap = await pixel(output, first.left + 4, gapY);
    expect(gap[1]).toBeLessThan(60);
  });

  it('keeps portrait text below the stack even above a very wide image', async () => {
    const all: SlideContent = { ...STACKED, badges: ['VERLEGT', 'NEUER TERMIN', 'AUSVERKAUFT'] };
    // A 10:1 panorama is only 108 px tall at full width.
    const output = await renderer.render(await redImage(2000, 200), all, '1080x1920', {
      ...BLACK_STYLE,
      accentColor: '#0000ff',
    });

    const last = badgeRects(PORTRAIT, all.badges)[2];
    // Left of the stack, level with the last badge: no white title glyphs there.
    const row = await sharp(output)
      .extract({ left: 0, top: last.top, width: last.left, height: last.height })
      .greyscale()
      .raw()
      .toBuffer();
    expect(Math.max(...row)).toBeLessThan(120);
  });

  describe('layout helpers', () => {
    it('returns no rects when badges or QR are absent', () => {
      expect(badgeRects({ width: 1920, height: 1080 }, [])).toEqual([]);
      expect(qrPlateRect({ width: 1920, height: 1080 }, null)).toBeNull();
    });

    it('keeps badge and QR plate inside the frame', () => {
      for (const dims of [
        { width: 1920, height: 1080 },
        { width: 1080, height: 1920 },
        { width: 3840, height: 2160 },
      ]) {
        const badges = badgeRects(dims, ['VERLEGT', 'NEUER TERMIN', 'AUSVERKAUFT']);
        for (const rect of [...badges, qrPlateRect(dims, 'https://x')]) {
          expect(rect!.left).toBeGreaterThan(0);
          expect(rect!.top).toBeGreaterThan(0);
          expect(rect!.left + rect!.width).toBeLessThan(dims.width);
          expect(rect!.top + rect!.height).toBeLessThan(dims.height);
        }
      }
    });
  });

  describe('badge stack', () => {
    it.each([
      ['landscape', LANDSCAPE],
      ['portrait', PORTRAIT],
      ['4K', { width: 3840, height: 2160 }],
    ] as const)('stacks top down, right aligned, without overlap (%s)', (_, dims) => {
      const rects = badgeRects(dims, ['VERLEGT', 'NEUER TERMIN', 'AUSVERKAUFT']);

      expect(new Set(rects.map((rect) => rect.left + rect.width)).size).toBe(1);
      for (let i = 1; i < rects.length; i++) {
        expect(rects[i].top).toBeGreaterThan(rects[i - 1].top + rects[i - 1].height);
      }
      // Landscape text and the QR plate live in the bottom band; the stack stays clear of it.
      const stackBottom = rects[2].top + rects[2].height;
      expect(stackBottom).toBeLessThan(qrPlateRect(dims, 'https://x')!.top);
      expect(stackBottom).toBeLessThan(dims.height / 2);
    });

    it('sizes every badge for the longest label', () => {
      const [short, long] = badgeRects(LANDSCAPE, ['VERLEGT', 'NEUER TERMIN']);
      expect(short.width).toBe(long.width);
      expect(badgeRects(LANDSCAPE, ['VERLEGT'])[0].width).toBeLessThan(long.width);
    });
  });

  describe('fitFontSize', () => {
    it('shrinks long names and respects the bounds', () => {
      expect(fitFontSize('ASP', 84, 40, 1760)).toBe(84);
      expect(fitFontSize('X'.repeat(50), 84, 40, 1760)).toBeLessThan(84);
      expect(fitFontSize('X'.repeat(500), 84, 40, 1760)).toBe(40);
      expect(fitFontSize('', 84, 40, 1760)).toBe(84);
    });
  });
});
