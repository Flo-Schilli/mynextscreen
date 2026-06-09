import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupWallPreview } from './screen-group-wall-preview';
import { ScreenWallPreviewService } from './screen-wall-preview.service';
import { GridCell } from './screen-group-grid-editor';
import { ScreenGroupScreen } from './screen-group.model';
import { Content } from '../content/content.model';

function makeAssigned(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 's1',
    name: 'Cell TV',
    location: 'Wall',
    groupId: 'g1',
    gridRow: 0,
    gridColumn: 0,
    ...overrides,
  };
}

function makeCell(overrides: Partial<GridCell> = {}): GridCell {
  return { row: 0, col: 0, screen: null, dropListId: 'cell-0-0', ...overrides };
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
    originalSizeBytes: 100,
    transcodedSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScreenGroupWallPreview', () => {
  let fixture: ComponentFixture<ScreenGroupWallPreview>;

  interface Inputs {
    gridCells?: GridCell[];
    gridColumns?: number | null;
    gridRows?: number | null;
    contentItems?: Content[];
    loadingContent?: boolean;
    previewImageUrl?: string | null;
    previewAspectRatio?: string;
  }

  function setUp(inputs: Inputs = {}): void {
    fixture = TestBed.createComponent(ScreenGroupWallPreview);
    fixture.componentRef.setInput('gridCells', inputs.gridCells ?? [makeCell()]);
    fixture.componentRef.setInput('gridColumns', inputs.gridColumns ?? 2);
    fixture.componentRef.setInput('gridRows', inputs.gridRows ?? 2);
    fixture.componentRef.setInput('contentItems', inputs.contentItems ?? []);
    fixture.componentRef.setInput('loadingContent', inputs.loadingContent ?? false);
    fixture.componentRef.setInput('previewImageUrl', inputs.previewImageUrl ?? null);
    fixture.componentRef.setInput('previewAspectRatio', inputs.previewAspectRatio ?? '16 / 9');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupWallPreview],
      providers: [provideZonelessChangeDetection(), ScreenWallPreviewService],
    }).compileComponents();
  });

  it('shows the loading text while content is loading', () => {
    setUp({ loadingContent: true });
    expect(fixture.debugElement.query(By.css('.loading-text'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('select'))).toBeNull();
  });

  it('renders the content options when content is loaded', () => {
    setUp({
      loadingContent: false,
      contentItems: [makeContent({ id: 'c1', title: 'Promo', type: 'image' })],
    });
    const options = fixture.debugElement.queryAll(By.css('option'));
    // first option is the placeholder
    expect(options.length).toBe(2);
    expect(options[1].nativeElement.textContent).toContain('Promo (image)');
  });

  it('does not render the preview grid when there is no preview image', () => {
    setUp({ previewImageUrl: null });
    expect(fixture.debugElement.query(By.css('.preview-grid'))).toBeNull();
  });

  it('renders the preview grid when a preview image is provided', () => {
    setUp({ previewImageUrl: 'http://x/img.png', gridColumns: 2, gridRows: 1 });
    const grid = fixture.debugElement.query(By.css('.preview-grid')).nativeElement as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(grid.style.gridTemplateRows).toBe('repeat(1, 1fr)');
    expect(grid.style.aspectRatio).toBe('16 / 9');
  });

  it('paints the source image only on assigned cells', () => {
    setUp({
      previewImageUrl: 'http://x/img.png',
      gridColumns: 2,
      gridRows: 1,
      gridCells: [
        makeCell({ col: 0, screen: makeAssigned({ name: 'Left' }), dropListId: 'cell-0-0' }),
        makeCell({ col: 1, screen: null, dropListId: 'cell-0-1' }),
      ],
    });
    const cells = fixture.debugElement.queryAll(By.css('.preview-cell'));
    expect((cells[0].nativeElement as HTMLElement).style.backgroundImage).toContain(
      'http://x/img.png',
    );
    expect((cells[1].nativeElement as HTMLElement).style.backgroundImage).toBe('none');
    expect(cells[1].nativeElement.classList.contains('unassigned')).toBe(true);
  });

  it('labels assigned cells with the screen name and empty cells with Empty', () => {
    setUp({
      previewImageUrl: 'http://x/img.png',
      gridColumns: 2,
      gridRows: 1,
      gridCells: [
        makeCell({ col: 0, screen: makeAssigned({ name: 'Left' }), dropListId: 'cell-0-0' }),
        makeCell({ col: 1, screen: null, dropListId: 'cell-0-1' }),
      ],
    });
    const labels = fixture.debugElement.queryAll(By.css('.preview-label'));
    expect(labels[0].nativeElement.textContent.trim()).toBe('Left');
    expect(labels[1].nativeElement.textContent.trim()).toBe('Empty');
  });

  it('derives background size from the wall-preview service', () => {
    setUp({ gridColumns: 3, gridRows: 2 });
    expect(fixture.componentInstance.bgSize()).toBe('300% 200%');
  });

  it('derives background position from the wall-preview service', () => {
    setUp({ gridColumns: 3, gridRows: 1 });
    expect(fixture.componentInstance.bgPosition(1, 0)).toBe('50% 0%');
  });

  it('applies the service-computed background size and position to assigned cells', () => {
    setUp({
      previewImageUrl: 'http://x/img.png',
      gridColumns: 2,
      gridRows: 1,
      gridCells: [makeCell({ col: 0, screen: makeAssigned(), dropListId: 'cell-0-0' })],
    });
    const cell = fixture.debugElement.query(By.css('.preview-cell')).nativeElement as HTMLElement;
    expect(cell.style.backgroundSize).toBe('200% 100%');
    expect(cell.style.backgroundPosition).toBe('0% 0%');
  });

  it('emits selectContent with the chosen id when the select changes', () => {
    setUp({ contentItems: [makeContent({ id: 'c1' })] });
    const spy = vi.fn();
    fixture.componentInstance.selectContent.subscribe(spy);

    const select = fixture.debugElement.query(By.css('select')).nativeElement as HTMLSelectElement;
    select.value = 'c1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('c1');
  });

  it('updates the selectedContentId model when the select changes', async () => {
    setUp({ contentItems: [makeContent({ id: 'c1' })] });

    const select = fixture.debugElement.query(By.css('select')).nativeElement as HTMLSelectElement;
    select.value = 'c1';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedContentId()).toBe('c1');
  });
});
