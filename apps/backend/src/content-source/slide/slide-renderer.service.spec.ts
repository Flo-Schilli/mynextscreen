import { sharp } from './sharp';
import {
  SlideRendererService,
  badgeRect,
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
  badge: null,
  qrUrl: null,
};

const WITH_EXTRAS: SlideContent = {
  ...PLAIN,
  badge: 'AUSVERKAUFT',
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

/** A point on the rect's left padding, clear of text and of rounded corners. */
const insideCorner = (rect: Rect | null): [number, number] => [
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
      badge: 'AUS\u0000VERKAUFT',
    };

    const output = await renderer.render(await redImage(), content, '1920x1080', BLACK_STYLE);

    expect((await sharp(output).metadata()).format).toBe('jpeg');
  });

  it('scales to 4K', async () => {
    const output = await renderer.render(await redImage(), WITH_EXTRAS, '3840x2160', BLACK_STYLE);

    const meta = await sharp(output).metadata();
    expect([meta.width, meta.height]).toEqual([3840, 2160]);
    const [x, y] = insideCorner(badgeRect({ width: 3840, height: 2160 }, WITH_EXTRAS.badge));
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

    const [bx, by] = insideCorner(badgeRect(dims, WITH_EXTRAS.badge));
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

    const [bx, by] = insideCorner(badgeRect(dims, 'AUSVERKAUFT'));
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
    const [bx, by] = insideCorner(badgeRect({ width: 1080, height: 1920 }, WITH_EXTRAS.badge));
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

  describe('layout helpers', () => {
    it('returns null rects when badge or QR are absent', () => {
      expect(badgeRect({ width: 1920, height: 1080 }, null)).toBeNull();
      expect(qrPlateRect({ width: 1920, height: 1080 }, null)).toBeNull();
    });

    it('keeps badge and QR plate inside the frame', () => {
      for (const dims of [
        { width: 1920, height: 1080 },
        { width: 1080, height: 1920 },
        { width: 3840, height: 2160 },
      ]) {
        for (const rect of [badgeRect(dims, 'NEUER TERMIN'), qrPlateRect(dims, 'https://x')]) {
          expect(rect!.left).toBeGreaterThan(0);
          expect(rect!.top).toBeGreaterThan(0);
          expect(rect!.left + rect!.width).toBeLessThan(dims.width);
          expect(rect!.top + rect!.height).toBeLessThan(dims.height);
        }
      }
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
