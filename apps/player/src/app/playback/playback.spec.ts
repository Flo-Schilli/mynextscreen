import { PlaylistItem } from '../player/player.models';

/**
 * Pure-function tests for playlist sequencing and preload decisions.
 *
 * Timing, anchoring and transition behaviour live in playback.component.spec.ts
 * against the real component — they cannot be reproduced by copies of the logic.
 */

// --- Item sequencing ---

function getCurrentItem(items: PlaylistItem[], index: number): PlaylistItem | null {
  if (items.length === 0) return null;
  return items[index % items.length] ?? null;
}

function getNextItem(items: PlaylistItem[], index: number): PlaylistItem | null {
  if (items.length <= 1) return null;
  return items[(index + 1) % items.length] ?? null;
}

function advanceIndex(currentIndex: number, totalItems: number): number {
  return (currentIndex + 1) % totalItems;
}

function shouldPreload(item: PlaylistItem | null): boolean {
  if (!item) return false;
  return item.type !== 'video';
}

// --- Tests ---

describe('Playlist item sequencing', () => {
  const items: PlaylistItem[] = [
    { url: '/api/media/org/img1', duration: 10, type: 'image' },
    { url: '/api/media/org/vid1', duration: 0, type: 'video' },
    { url: '/api/media/org/img2', duration: 5, type: 'image' },
  ];

  it('should return null for empty playlist', () => {
    expect(getCurrentItem([], 0)).toBeNull();
  });

  it('should return first item at index 0', () => {
    expect(getCurrentItem(items, 0)).toEqual(items[0]);
  });

  it('should return correct item at index', () => {
    expect(getCurrentItem(items, 1)).toEqual(items[1]);
    expect(getCurrentItem(items, 2)).toEqual(items[2]);
  });

  it('should wrap around on overflow index', () => {
    expect(getCurrentItem(items, 3)).toEqual(items[0]);
    expect(getCurrentItem(items, 5)).toEqual(items[2]);
  });

  it('should return null next item for single-item playlist', () => {
    expect(getNextItem([items[0]], 0)).toBeNull();
  });

  it('should return next item', () => {
    expect(getNextItem(items, 0)).toEqual(items[1]);
    expect(getNextItem(items, 1)).toEqual(items[2]);
  });

  it('should wrap next item to first', () => {
    expect(getNextItem(items, 2)).toEqual(items[0]);
  });
});

describe('Index advancement', () => {
  it('should advance to next index', () => {
    expect(advanceIndex(0, 3)).toBe(1);
    expect(advanceIndex(1, 3)).toBe(2);
  });

  it('should wrap to zero at end', () => {
    expect(advanceIndex(2, 3)).toBe(0);
  });

  it('should handle single item', () => {
    expect(advanceIndex(0, 1)).toBe(0);
  });
});

describe('Preload decisions', () => {
  it('should preload images', () => {
    expect(shouldPreload({ url: '/img', duration: 10, type: 'image' })).toBe(true);
  });

  it('should not preload videos', () => {
    expect(shouldPreload({ url: '/vid', duration: 0, type: 'video' })).toBe(false);
  });

  it('should not preload null item', () => {
    expect(shouldPreload(null)).toBe(false);
  });
});
