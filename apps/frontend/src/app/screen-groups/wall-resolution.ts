import type { ScreenGroup, ScreenGroupScreen } from './screen-group.model';

interface Size {
  width: number;
  height: number;
}

/** `1920x1080` as stored on a screen; anything else is ignored rather than guessed at. */
function parseResolution(resolution: string | undefined): Size | null {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(resolution?.trim() ?? '');
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function sizesOf(screens: ScreenGroupScreen[]): Size[] {
  return screens.map((screen) => parseResolution(screen.resolution)).filter((s): s is Size => !!s);
}

function format({ width, height }: Size): string {
  return `${width} × ${height}`;
}

/**
 * How large the whole group is as one picture.
 *
 * In split mode that is the wall: the columns' widths added up and the rows'
 * heights added up, so two 1920×1080 side by side read 3840×1080. A column or
 * row with nothing in it yet counts as the largest screen the group has, which
 * is what the wall becomes once it is filled.
 *
 * In mirror mode every screen shows the same picture, so there is nothing to
 * add up — the group's resolution is the screens' own, and only when they
 * agree. Returns null when there is nothing meaningful to show.
 */
export function wallResolution(group: ScreenGroup): string | null {
  const sizes = sizesOf(group.screens);
  if (sizes.length === 0) return null;

  if (group.mode === 'mirror') {
    const first = sizes[0];
    const uniform = sizes.every((s) => s.width === first.width && s.height === first.height);
    return uniform ? format(first) : null;
  }

  const columns = group.gridColumns ?? 0;
  const rows = group.gridRows ?? 0;
  if (columns < 1 || rows < 1) return null;

  const fallback: Size = {
    width: Math.max(...sizes.map((s) => s.width)),
    height: Math.max(...sizes.map((s) => s.height)),
  };

  const cellSizes = group.screens
    .map((screen) => ({ screen, size: parseResolution(screen.resolution) }))
    .filter((entry): entry is { screen: ScreenGroupScreen; size: Size } => !!entry.size);

  const extentOf = (
    count: number,
    cellIndex: (screen: ScreenGroupScreen) => number | null,
    sizeOf: (size: Size) => number,
    fallbackValue: number,
  ): number => {
    let total = 0;
    for (let index = 1; index <= count; index++) {
      const inLine = cellSizes.filter((entry) => cellIndex(entry.screen) === index);
      total += inLine.length
        ? Math.max(...inLine.map((entry) => sizeOf(entry.size)))
        : fallbackValue;
    }
    return total;
  };

  return format({
    width: extentOf(
      columns,
      (s) => s.gridColumn,
      (size) => size.width,
      fallback.width,
    ),
    height: extentOf(
      rows,
      (s) => s.gridRow,
      (size) => size.height,
      fallback.height,
    ),
  });
}
