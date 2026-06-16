import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentGrid } from './content-grid';
import { Content } from './content.model';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: 'org1',
    title: 'Promo',
    description: null,
    tags: [],
    type: 'image',
    originalFilename: 'promo.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 1024,
    transcodedSizeBytes: null,
    thumbnailSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContentGrid', () => {
  let fixture: ComponentFixture<ContentGrid>;
  let selection: SelectionService;

  function setUp(
    opts: {
      items?: Content[];
      progress?: Record<string, number | undefined>;
      bulkActions?: BulkAction[];
    } = {},
  ): void {
    const items = opts.items ?? [makeContent()];
    fixture = TestBed.createComponent(ContentGrid);
    selection = TestBed.inject(SelectionService);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput(
      'contentIds',
      items.map((i) => i.id),
    );
    fixture.componentRef.setInput('transcodingProgress', opts.progress ?? {});
    fixture.componentRef.setInput('bulkActions', opts.bulkActions ?? []);
    // Mirrors ContentService.getStaticThumbnailUrl: thumb when present, image
    // falls back to the transcoded frame, video without a thumb gets null.
    fixture.componentRef.setInput('thumbUrl', (c: Content) =>
      c.thumbnailSizeBytes != null
        ? `/thumb/${c.id}`
        : c.type === 'image'
          ? `/preview/${c.id}`
          : null,
    );
    fixture.detectChanges();
  }

  function cards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.content-card'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), SelectionService],
    });
  });

  it('renders one card per item with title and formatted meta', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ title: 'A' }), makeContent({ id: 'c2', title: 'B' })] });

    // Assert
    expect(cards().length).toBe(2);
    const firstMeta = cards()[0].querySelector('.card-meta')?.textContent as string;
    expect(firstMeta).toContain('image');
    expect(firstMeta).toContain('1.0 KB');
  });

  it('renders an image thumbnail for completed images using the thumbUrl fn', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ type: 'image', transcodingStatus: 'completed' })] });

    // Assert
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.thumb-img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('/preview/c1');
  });

  it('renders a still thumbnail for a video that has a precomputed thumbnail', () => {
    // Arrange / Act
    setUp({
      items: [
        makeContent({ type: 'video', transcodingStatus: 'completed', thumbnailSizeBytes: 42 }),
      ],
    });

    // Assert
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.thumb-img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('/thumb/c1');
    // A play badge is overlaid on the video thumbnail.
    expect(fixture.nativeElement.querySelector('.thumb-play-overlay')).not.toBeNull();
  });

  it('does not overlay a play badge on image thumbnails', () => {
    // Arrange / Act
    setUp({
      items: [
        makeContent({ type: 'image', transcodingStatus: 'completed', thumbnailSizeBytes: 42 }),
      ],
    });

    // Assert
    expect(fixture.nativeElement.querySelector('.thumb-img')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.thumb-play-overlay')).toBeNull();
  });

  it('renders the video placeholder for a video without a thumbnail', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ type: 'video', transcodingStatus: 'completed' })] });

    // Assert
    expect(fixture.nativeElement.querySelector('.thumb-placeholder.video')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.thumb-img')).toBeNull();
  });

  it('renders the generic placeholder for an image that is not yet completed', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ type: 'image', transcodingStatus: 'pending' })] });

    // Assert
    const placeholder = fixture.nativeElement.querySelector('.thumb-placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains('video')).toBe(false);
    expect(fixture.nativeElement.querySelector('.thumb-img')).toBeNull();
  });

  it('shows a Pending overlay for pending transcoding', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ transcodingStatus: 'pending' })] });

    // Assert
    expect(fixture.nativeElement.querySelector('.transcoding-overlay')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.overlay-text').textContent).toContain('Pending');
  });

  it('shows the live progress percent and fill width while processing', () => {
    // Arrange / Act
    setUp({
      items: [makeContent({ transcodingStatus: 'processing' })],
      progress: { c1: 65 },
    });

    // Assert
    expect(fixture.nativeElement.querySelector('.overlay-text').textContent).toContain('65%');
    const fill: HTMLElement = fixture.nativeElement.querySelector('.overlay-fill');
    expect(fill.style.width).toBe('65%');
  });

  it('defaults the processing percent to 0 when no progress is reported', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ transcodingStatus: 'processing' })], progress: {} });

    // Assert
    expect(fixture.nativeElement.querySelector('.overlay-text').textContent).toContain('0%');
    const fill: HTMLElement = fixture.nativeElement.querySelector('.overlay-fill');
    expect(fill.style.width).toBe('0%');
  });

  it('shows a Failed overlay for failed transcoding', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ transcodingStatus: 'failed' })] });

    // Assert
    const overlay: HTMLElement = fixture.nativeElement.querySelector('.overlay-text.failed');
    expect(overlay.textContent).toContain('Failed');
  });

  it('renders no overlay for completed content', () => {
    // Arrange / Act
    setUp({ items: [makeContent({ transcodingStatus: 'completed' })] });

    // Assert
    expect(fixture.nativeElement.querySelector('.transcoding-overlay')).toBeNull();
  });

  it('emits selectItem when a card is clicked', () => {
    // Arrange
    const item = makeContent();
    setUp({ items: [item] });
    const emitted: Content[] = [];
    fixture.componentInstance.selectItem.subscribe((c) => emitted.push(c));

    // Act
    cards()[0].click();

    // Assert
    expect(emitted).toEqual([item]);
  });

  it('emits selectItem on Enter keydown for keyboard users', () => {
    // Arrange
    const item = makeContent();
    setUp({ items: [item] });
    const spy = vi.fn();
    fixture.componentInstance.selectItem.subscribe(spy);

    // Act
    cards()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    // Assert
    expect(spy).toHaveBeenCalledWith(item);
  });

  it('reflects selection state from the SelectionService onto the card', () => {
    // Arrange
    setUp({ items: [makeContent({ id: 'c1' })] });
    expect(cards()[0].classList.contains('selected')).toBe(false);

    // Act
    selection.toggle('c1');
    fixture.detectChanges();

    // Assert
    expect(cards()[0].classList.contains('selected')).toBe(true);
  });

  it('exposes the any-selected state on the card checkbox when something is selected', () => {
    // Arrange
    setUp({ items: [makeContent({ id: 'c1' })] });
    const checkbox = (): HTMLElement => fixture.nativeElement.querySelector('.card-checkbox');
    expect(checkbox().classList.contains('any-selected')).toBe(false);

    // Act
    selection.toggle('c1');
    fixture.detectChanges();

    // Assert
    expect(checkbox().classList.contains('any-selected')).toBe(true);
  });
});
