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
/**
 * Largest share of a landscape image's width a portrait slide may crop away
 * (see {@link portraitImageSize}).
 */
const PORTRAIT_MAX_CROP = 0.15;
/** Space between the image and the top of the title's capitals. */
const PORTRAIT_TEXT_GAP = 70;
/** Capital height and descender depth relative to font size (Liberation Sans). */
const CAP_HEIGHT = 0.72;
const DESCENT = 0.22;
const QR_SIZE = 220;
const QR_PLATE_PADDING = 14;
const QR_GAP = 40;
const BADGE_MARGIN = 60;
const BADGE_HEIGHT = 72;
const BADGE_FONT_SIZE = 40;
const BADGE_PADDING_X = 30;
const BADGE_GAP = 16;
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

/**
 * Where the status badges sit: stacked top right, one below the other, all
 * as wide as the longest label so the stack reads as one column. Empty when
 * there is nothing to show.
 */
export function badgeRects(dims: SlideDimensions, badges: readonly string[]): Rect[] {
  if (badges.length === 0) return [];
  const s = scaleOf(dims);
  const fontSize = BADGE_FONT_SIZE * s;
  const longest = Math.max(...badges.map((badge) => badge.length));
  const width = Math.round(longest * fontSize * AVG_CHAR_WIDTH + 2 * BADGE_PADDING_X * s);
  const height = Math.round(BADGE_HEIGHT * s);
  const step = height + Math.round(BADGE_GAP * s);
  return badges.map((_, index) => ({
    left: Math.round(dims.width - BADGE_MARGIN * s - width),
    top: Math.round(BADGE_MARGIN * s) + index * step,
    width,
    height,
  }));
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

interface TextMetrics {
  titleSize: number;
  metaSize: number;
}

/** Font sizes of title and meta line, shrunk until they fit the text column. */
function textMetrics(dims: SlideDimensions, content: SlideContent): TextMetrics {
  const s = scaleOf(dims);
  const paddingX = PADDING_X * s;
  // Landscape text shares the bottom row with the QR code; portrait text sits above it.
  const plate = qrPlateRect(dims, content.qrUrl);
  const qrReserve = plate && !isPortrait(dims) ? plate.width + QR_GAP * s : 0;
  const maxTextWidth = dims.width - 2 * paddingX - qrReserve;
  return {
    titleSize: fitFontSize(
      content.title,
      TITLE_FONT_SIZE * s,
      TITLE_MIN_FONT_SIZE * s,
      maxTextWidth,
    ),
    metaSize: fitFontSize(
      content.metaLine,
      META_FONT_SIZE * s,
      META_MIN_FONT_SIZE * s,
      maxTextWidth,
    ),
  };
}

/**
 * Size of the image area on a portrait slide, at most `maxWidth` x `maxHeight`.
 * Square and upright images are fitted whole: they already fill the column.
 * A landscape image fitted to the width leaves a thin band over an empty
 * slide, so it may grow taller than its aspect allows, up to a square and as
 * long as at most {@link PORTRAIT_MAX_CROP} of its width is cropped away. The
 * crop itself is left to sharp's `attention` strategy, which trims the least
 * interesting edge strip by strip (skin tones and saturated detail stay).
 */
export function portraitImageSize(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const aspect = imageWidth / imageHeight;
  if (aspect <= 1 || aspect <= maxWidth / maxHeight) {
    const height = Math.min(maxHeight, maxWidth / aspect);
    return { width: Math.round(height * aspect), height: Math.round(height) };
  }
  const height = Math.min(maxHeight, maxWidth, maxWidth / aspect / (1 - PORTRAIT_MAX_CROP));
  return { width: maxWidth, height: Math.round(height) };
}

/** Where the image and the title go on a portrait slide. */
export interface PortraitLayout {
  image: Rect;
  /** Baseline of the title; the meta line follows below it. */
  titleY: number;
}

/**
 * Lays out a portrait slide as one block: the image, at full width or as tall
 * as fits, with the text right below it. The block is centred on the slide and
 * pushed up only as far as needed to stay clear of the QR code. The title
 * never runs under the badge stack.
 */
export function portraitLayout(
  dims: SlideDimensions,
  content: SlideContent,
  imageSize: { width: number; height: number } | null,
): PortraitLayout {
  const s = scaleOf(dims);
  const { titleSize, metaSize } = textMetrics(dims, content);
  const titleOffset = PORTRAIT_TEXT_GAP * s + titleSize * CAP_HEIGHT;
  const textHeight = titleOffset + LINE_GAP * s + metaSize * (1 + DESCENT);
  const plate = qrPlateRect(dims, content.qrUrl);
  const bottomLimit = plate ? plate.top - QR_GAP * s : dims.height - PADDING_BOTTOM * s;

  const size = imageSize
    ? portraitImageSize(imageSize.width, imageSize.height, dims.width, bottomLimit - textHeight)
    : { width: 0, height: 0 };
  const blockHeight = size.height + textHeight;
  const top = Math.max(0, Math.min((dims.height - blockHeight) / 2, bottomLimit - blockHeight));
  const image = {
    left: Math.floor((dims.width - size.width) / 2),
    top: Math.round(top),
    width: size.width,
    height: size.height,
  };

  const stack = badgeRects(dims, content.badges).at(-1);
  const belowBadges = stack ? stack.top + stack.height + LINE_GAP * s + titleSize : 0;
  return {
    image,
    titleY: Math.round(Math.max(image.top + image.height + titleOffset, belowBadges)),
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
 * text bottom left (the approved cbf-screens look), portrait centres image and
 * text block as one composition (see {@link portraitLayout}).
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
    const layers: SharpOverlay[] = [];
    let titleY: number | null = null;

    if (isPortrait(dims)) {
      const meta = image ? await sharp(image).metadata() : null;
      const layout = portraitLayout(
        dims,
        content,
        meta?.width && meta.height ? { width: meta.width, height: meta.height } : null,
      );
      if (image && layout.image.height > 0) {
        layers.push(await this.portraitImageLayer(image, layout.image));
      }
      titleY = layout.titleY;
    } else if (image) {
      layers.push(await this.landscapeImageLayer(image, dims));
    }

    layers.push({
      input: Buffer.from(this.overlaySvg(dims, content, style, titleY)),
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

  /** Landscape: the whole image, fitted and centred on the full frame. */
  private async landscapeImageLayer(image: Buffer, dims: SlideDimensions): Promise<SharpOverlay> {
    const fitted = await sharp(image)
      .resize(dims.width, dims.height, { fit: 'inside', kernel: 'lanczos3' })
      .flatten({ background: BLACK })
      .png()
      .toBuffer({ resolveWithObject: true });
    return {
      input: fitted.data,
      left: Math.floor((dims.width - fitted.info.width) / 2),
      top: Math.floor((dims.height - fitted.info.height) / 2),
    };
  }

  /** Portrait: the image filling its box, cropped where the box asks for it. */
  private async portraitImageLayer(image: Buffer, box: Rect): Promise<SharpOverlay> {
    const data = await sharp(image)
      .resize(box.width, box.height, {
        fit: 'cover',
        position: sharp.strategy.attention,
        kernel: 'lanczos3',
      })
      .flatten({ background: BLACK })
      .png()
      .toBuffer();
    return { input: data, left: box.left, top: box.top };
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

  /** `portraitTitleY` is the title baseline on a portrait slide, null for landscape. */
  private overlaySvg(
    dims: SlideDimensions,
    content: SlideContent,
    style: SlideStyle,
    portraitTitleY: number | null,
  ): string {
    const s = scaleOf(dims);
    const { width, height } = dims;
    const plate = qrPlateRect(dims, content.qrUrl);
    const paddingX = PADDING_X * s;
    const { titleSize, metaSize } = textMetrics(dims, content);
    const titleY = portraitTitleY ?? height - PADDING_BOTTOM * s - metaSize - LINE_GAP * s;
    const metaY =
      portraitTitleY !== null ? titleY + metaSize + LINE_GAP * s : height - PADDING_BOTTOM * s;
    // Portrait darkens from just above the title down, landscape the bottom band.
    const shadeTop =
      portraitTitleY !== null
        ? titleY - titleSize - GRADIENT_HEIGHT * s * 0.5
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
  ${this.badgesSvg(dims, content.badges, safeAccent(style.accentColor))}
  ${plate ? `<rect x="${plate.left}" y="${plate.top}" width="${plate.width}" height="${plate.height}" fill="#fff"/>` : ''}
</svg>`;
  }

  private badgesSvg(dims: SlideDimensions, badges: readonly string[], accentColor: string): string {
    const fontSize = BADGE_FONT_SIZE * scaleOf(dims);
    const textColor = textColorOn(accentColor);
    return badgeRects(dims, badges)
      .map((rect, index) => {
        const textX = rect.left + rect.width / 2;
        const textY = rect.top + rect.height / 2 + fontSize * 0.36;
        return `<rect x="${rect.left}" y="${rect.top}" width="${rect.width}" height="${rect.height}" rx="${rect.height / 6}" fill="${accentColor}"/>
  <text x="${textX}" y="${textY}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="${textColor}">${escapeXml(badges[index])}</text>`;
      })
      .join('\n  ');
  }
}
