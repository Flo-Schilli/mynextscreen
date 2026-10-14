import { Injectable } from '@nestjs/common';
import { sharp, type SharpOverlay } from './sharp';
import * as QRCode from 'qrcode';
import { DEFAULT_SLIDE_STYLE, type SlideFormat, type SlideStyle } from '../content-source.types';
import { parseSlideFormat, type SlideContent, type SlideDimensions } from './slide-content';

/** Base sizes are for a 1080 px short edge and scale with the format. */
const BASE_SHORT_EDGE = 1080;
const PADDING_X = 80;
const PADDING_BOTTOM = 70;
const GRADIENT_HEIGHT = 400;
const TITLE_FONT_SIZE = 84;
const TITLE_MIN_FONT_SIZE = 40;
const META_FONT_SIZE = 44;
const META_MIN_FONT_SIZE = 28;
const LINE_GAP = 22;
const PORTRAIT_IMAGE_SHARE = 0.6;
const PORTRAIT_TEXT_OFFSET = 150;
const QR_SIZE = 220;
const QR_PLATE_PADDING = 14;
const QR_GAP = 40;
const BADGE_MARGIN = 60;
const BADGE_HEIGHT = 72;
const BADGE_FONT_SIZE = 40;
const BADGE_PADDING_X = 30;
const BLUR_SIGMA = 30;
const BLUR_BRIGHTNESS = 0.45;
/** Rough glyph width relative to font size (bold capitals). */
const AVG_CHAR_WIDTH = 0.62;
const FONT_FAMILY = "'Liberation Sans', 'DejaVu Sans', Arial, sans-serif";
const JPEG_QUALITY = 90;
const BLACK = '#000000';
const LUMINANCE_THRESHOLD = 0.6;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};
/** Control characters XML 1.0 forbids even as references; scraped text may carry them. */
// eslint-disable-next-line no-control-regex
const XML_INVALID_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const escapeXml = (text: string): string =>
  text.replace(XML_INVALID_CHARS, '').replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

/** Shrinks the font until the text fits the available width. */
export function fitFontSize(
  text: string,
  maxSize: number,
  minSize: number,
  maxWidth: number,
): number {
  const estimated = Math.floor(maxWidth / (Math.max(text.length, 1) * AVG_CHAR_WIDTH));
  return Math.max(minSize, Math.min(maxSize, estimated));
}

const scaleOf = ({ width, height }: SlideDimensions): number =>
  Math.min(width, height) / BASE_SHORT_EDGE;

const isPortrait = ({ width, height }: SlideDimensions): boolean => height > width;

/** Where the status badge sits (top right), or null without badge. */
export function badgeRect(dims: SlideDimensions, badge: string | null): Rect | null {
  if (!badge) return null;
  const s = scaleOf(dims);
  const fontSize = BADGE_FONT_SIZE * s;
  const width = Math.round(badge.length * fontSize * AVG_CHAR_WIDTH + 2 * BADGE_PADDING_X * s);
  return {
    left: Math.round(dims.width - BADGE_MARGIN * s - width),
    top: Math.round(BADGE_MARGIN * s),
    width,
    height: Math.round(BADGE_HEIGHT * s),
  };
}

/** The white plate behind the QR code (bottom right), or null without QR code. */
export function qrPlateRect(dims: SlideDimensions, qrUrl: string | null): Rect | null {
  if (!qrUrl) return null;
  const s = scaleOf(dims);
  const size = Math.round((QR_SIZE + 2 * QR_PLATE_PADDING) * s);
  return {
    left: Math.round(dims.width - PADDING_BOTTOM * s - size),
    top: Math.round(dims.height - PADDING_BOTTOM * s - size),
    width: size,
    height: size,
  };
}

/** The accent ends up inside SVG markup, so anything but `#rrggbb` is replaced. */
const safeAccent = (color: string): string =>
  HEX_COLOR.test(color) ? color : DEFAULT_SLIDE_STYLE.accentColor;

/** Black or white, whichever reads better on the accent colour. */
function textColorOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > LUMINANCE_THRESHOLD ? BLACK : '#ffffff';
}

/**
 * Renders event slides: landscape puts the fitted image full-frame with the
 * text bottom left (the approved cbf-screens look), portrait puts the image on
 * top at full width with the text block below.
 */
@Injectable()
export class SlideRendererService {
  async render(
    image: Buffer | null,
    content: SlideContent,
    format: SlideFormat,
    style: SlideStyle,
  ): Promise<Buffer> {
    const dims = parseSlideFormat(format);
    const imageBox = this.imageBox(dims);
    const layers: SharpOverlay[] = [];
    let imageBottom = imageBox.top + imageBox.height;

    if (image) {
      const fitted = await sharp(image)
        .resize(imageBox.width, imageBox.height, { fit: 'inside', kernel: 'lanczos3' })
        .flatten({ background: BLACK })
        .png()
        .toBuffer({ resolveWithObject: true });
      const left = imageBox.left + Math.floor((imageBox.width - fitted.info.width) / 2);
      // Portrait keeps the image flush with the top edge, landscape centres it.
      const top = isPortrait(dims)
        ? imageBox.top
        : imageBox.top + Math.floor((imageBox.height - fitted.info.height) / 2);
      layers.push({ input: fitted.data, left, top });
      imageBottom = top + fitted.info.height;
    }

    layers.push({
      input: Buffer.from(this.overlaySvg(dims, content, style, imageBottom)),
      left: 0,
      top: 0,
    });

    const plate = qrPlateRect(dims, content.qrUrl);
    if (plate && content.qrUrl) {
      layers.push(await this.qrLayer(content.qrUrl, plate, scaleOf(dims)));
    }

    const background = await this.background(dims, image, style);
    return sharp(background)
      .composite(layers)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  }

  private imageBox(dims: SlideDimensions): Rect {
    if (!isPortrait(dims)) {
      return { left: 0, top: 0, width: dims.width, height: dims.height };
    }
    return {
      left: 0,
      top: 0,
      width: dims.width,
      height: Math.round(dims.height * PORTRAIT_IMAGE_SHARE),
    };
  }

  private async background(
    dims: SlideDimensions,
    image: Buffer | null,
    style: SlideStyle,
  ): Promise<Buffer> {
    if (image && style.background === 'blur') {
      return sharp(image)
        .resize(dims.width, dims.height, { fit: 'cover' })
        .flatten({ background: BLACK })
        .blur(BLUR_SIGMA * scaleOf(dims))
        .modulate({ brightness: BLUR_BRIGHTNESS })
        .png()
        .toBuffer();
    }
    return sharp({
      create: { width: dims.width, height: dims.height, channels: 3, background: BLACK },
    })
      .png()
      .toBuffer();
  }

  private async qrLayer(url: string, plate: Rect, scale: number): Promise<SharpOverlay> {
    const padding = Math.round(QR_PLATE_PADDING * scale);
    const size = plate.width - 2 * padding;
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: BLACK, light: '#ffffff' },
    });
    const qr = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    return { input: qr, left: plate.left + padding, top: plate.top + padding };
  }

  private overlaySvg(
    dims: SlideDimensions,
    content: SlideContent,
    style: SlideStyle,
    imageBottom: number,
  ): string {
    const s = scaleOf(dims);
    const { width, height } = dims;
    const plate = qrPlateRect(dims, content.qrUrl);
    const paddingX = PADDING_X * s;
    const portrait = isPortrait(dims);
    // Landscape text shares the bottom row with the QR code; portrait text sits above it.
    const qrReserve = plate && !portrait ? plate.width + QR_GAP * s : 0;
    const maxTextWidth = width - 2 * paddingX - qrReserve;
    const titleSize = fitFontSize(
      content.title,
      TITLE_FONT_SIZE * s,
      TITLE_MIN_FONT_SIZE * s,
      maxTextWidth,
    );
    const metaSize = fitFontSize(
      content.metaLine,
      META_FONT_SIZE * s,
      META_MIN_FONT_SIZE * s,
      maxTextWidth,
    );
    const titleY = portrait
      ? imageBottom + PORTRAIT_TEXT_OFFSET * s
      : height - PADDING_BOTTOM * s - metaSize - LINE_GAP * s;
    const metaY = portrait ? titleY + metaSize + LINE_GAP * s : height - PADDING_BOTTOM * s;
    const shadeTop = portrait
      ? imageBottom - GRADIENT_HEIGHT * s * 0.5
      : height - GRADIENT_HEIGHT * s;

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.75"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${shadeTop}" width="${width}" height="${height - shadeTop}" fill="url(#shade)"/>
  <g font-family="${FONT_FAMILY}" fill="#fff">
    <text x="${paddingX}" y="${titleY}" font-size="${titleSize}" font-weight="bold">${escapeXml(content.title)}</text>
    <text x="${paddingX}" y="${metaY}" font-size="${metaSize}">${escapeXml(content.metaLine)}</text>
  </g>
  ${this.badgeSvg(dims, content.badge, safeAccent(style.accentColor))}
  ${plate ? `<rect x="${plate.left}" y="${plate.top}" width="${plate.width}" height="${plate.height}" fill="#fff"/>` : ''}
</svg>`;
  }

  private badgeSvg(dims: SlideDimensions, badge: string | null, accentColor: string): string {
    const rect = badgeRect(dims, badge);
    if (!rect || !badge) return '';
    const fontSize = BADGE_FONT_SIZE * scaleOf(dims);
    const textX = rect.left + rect.width / 2;
    const textY = rect.top + rect.height / 2 + fontSize * 0.36;
    return `<rect x="${rect.left}" y="${rect.top}" width="${rect.width}" height="${rect.height}" rx="${rect.height / 6}" fill="${accentColor}"/>
  <text x="${textX}" y="${textY}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="${textColorOn(accentColor)}">${escapeXml(badge)}</text>`;
  }
}
