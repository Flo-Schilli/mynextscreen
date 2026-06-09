import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ScreenGroupGridEditor, GridCell } from './screen-group-grid-editor';
import { ScreenGroupScreen } from './screen-group.model';
import { Screen } from '../screens/screen.model';

function makeAssigned(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 's1',
    name: 'Screen One',
    location: 'Lobby',
    groupId: 'g1',
    gridRow: 0,
    gridColumn: 0,
    ...overrides,
  };
}

function makeCell(overrides: Partial<GridCell> = {}): GridCell {
  return {
    row: 0,
    col: 0,
    screen: null,
    dropListId: 'cell-0-0',
    ...overrides,
  };
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 'av1',
    organisationId: 'org1',
    name: 'Available One',
    resolution: '1920x1080',
    location: 'Hall',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScreenGroupGridEditor', () => {
  let fixture: ComponentFixture<ScreenGroupGridEditor>;

  interface Inputs {
    gridCells?: GridCell[];
    availableScreens?: Screen[];
    allDropListIds?: string[];
    loadingScreens?: boolean;
    gridColumns?: number | null;
    gridRows?: number | null;
    groupId?: string;
    isDroppingOver?: string;
  }

  function setUp(inputs: Inputs = {}): void {
    fixture = TestBed.createComponent(ScreenGroupGridEditor);
    fixture.componentRef.setInput('gridCells', inputs.gridCells ?? [makeCell()]);
    fixture.componentRef.setInput('availableScreens', inputs.availableScreens ?? []);
    fixture.componentRef.setInput(
      'allDropListIds',
      inputs.allDropListIds ?? ['sidebar-list', 'cell-0-0'],
    );
    fixture.componentRef.setInput('loadingScreens', inputs.loadingScreens ?? false);
    fixture.componentRef.setInput('gridColumns', inputs.gridColumns ?? 1);
    fixture.componentRef.setInput('gridRows', inputs.gridRows ?? 1);
    fixture.componentRef.setInput('groupId', inputs.groupId ?? 'g1');
    fixture.componentRef.setInput('isDroppingOver', inputs.isDroppingOver ?? '');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupGridEditor],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders the grid dimensions in the heading', () => {
    setUp({ gridColumns: 3, gridRows: 2 });
    expect(
      fixture.debugElement.query(By.css('.grid-section .section-title')).nativeElement.textContent,
    ).toContain('Grid Layout (3x2)');
  });

  it('sets the grid template columns and rows styles', () => {
    setUp({ gridColumns: 3, gridRows: 2 });
    const container = fixture.debugElement.query(By.css('.grid-container'))
      .nativeElement as HTMLElement;
    expect(container.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(container.style.gridTemplateRows).toBe('repeat(2, 1fr)');
  });

  it('renders an empty cell with its position when no screen is assigned', () => {
    setUp({ gridCells: [makeCell({ row: 1, col: 2, dropListId: 'cell-1-2' })] });
    expect(fixture.debugElement.query(By.css('.cell-empty'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.cell-screen'))).toBeNull();
    expect(
      fixture.debugElement.query(By.css('.cell-position')).nativeElement.textContent.trim(),
    ).toBe('2,1');
  });

  it('renders an occupied cell with the screen name', () => {
    const cell = makeCell({ screen: makeAssigned({ name: 'Wall TV' }) });
    setUp({ gridCells: [cell] });
    expect(fixture.debugElement.query(By.css('.cell-screen'))).not.toBeNull();
    expect(
      fixture.debugElement.query(By.css('.cell-screen-name')).nativeElement.textContent,
    ).toContain('Wall TV');
  });

  it('marks an occupied cell with the occupied class', () => {
    const cell = makeCell({ screen: makeAssigned() });
    setUp({ gridCells: [cell] });
    expect(
      fixture.debugElement.query(By.css('.grid-cell')).nativeElement.classList.contains('occupied'),
    ).toBe(true);
  });

  it('marks the cell currently being dropped over with the dropping class', () => {
    setUp({ gridCells: [makeCell({ dropListId: 'cell-0-0' })], isDroppingOver: 'cell-0-0' });
    expect(
      fixture.debugElement.query(By.css('.grid-cell')).nativeElement.classList.contains('dropping'),
    ).toBe(true);
  });

  it('shows the loading text while screens are loading', () => {
    setUp({ loadingScreens: true });
    expect(fixture.debugElement.query(By.css('.loading-text'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.sidebar-list'))).toBeNull();
  });

  it('shows the empty sidebar message when no screens are available', () => {
    setUp({ loadingScreens: false, availableScreens: [] });
    expect(fixture.debugElement.query(By.css('.sidebar-empty'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.sidebar-list'))).toBeNull();
  });

  it('renders the available-screens list when screens exist', () => {
    setUp({
      availableScreens: [
        makeScreen({ name: 'Avail A' }),
        makeScreen({ id: 'av2', name: 'Avail B' }),
      ],
    });
    const items = fixture.debugElement.queryAll(By.css('.sidebar-screen'));
    expect(items.length).toBe(2);
    expect(items[0].query(By.css('.sidebar-screen-name')).nativeElement.textContent).toContain(
      'Avail A',
    );
  });

  it('shows the in-another-group badge for screens belonging to a different group', () => {
    setUp({
      groupId: 'g1',
      availableScreens: [makeScreen({ groupId: 'g2' })],
    });
    expect(fixture.debugElement.query(By.css('.already-assigned-badge'))).not.toBeNull();
  });

  it('hides the in-another-group badge for screens in the current group', () => {
    setUp({
      groupId: 'g1',
      availableScreens: [makeScreen({ groupId: 'g1' })],
    });
    expect(fixture.debugElement.query(By.css('.already-assigned-badge'))).toBeNull();
  });

  it('hides the in-another-group badge for unassigned screens', () => {
    setUp({ availableScreens: [makeScreen({ groupId: null })] });
    expect(fixture.debugElement.query(By.css('.already-assigned-badge'))).toBeNull();
  });

  it('emits dropToCell when a cell drop list fires a drop event', () => {
    setUp({ gridCells: [makeCell()] });
    const spy = vi.fn();
    fixture.componentInstance.dropToCell.subscribe(spy);

    const cellList = fixture.debugElement.queryAll(By.directive(CdkDropList))[0];
    const event = {} as CdkDragDrop<GridCell, GridCell>;
    cellList.triggerEventHandler('cdkDropListDropped', event);

    expect(spy).toHaveBeenCalledWith(event);
  });

  it('emits dropToSidebar when the sidebar drop list fires a drop event', () => {
    setUp({ availableScreens: [makeScreen()] });
    const spy = vi.fn();
    fixture.componentInstance.dropToSidebar.subscribe(spy);

    const sidebar = fixture.debugElement.query(By.css('#sidebar-list'));
    const event = {} as CdkDragDrop<Screen[], GridCell>;
    sidebar.triggerEventHandler('cdkDropListDropped', event);

    expect(spy).toHaveBeenCalledWith(event);
  });
});
