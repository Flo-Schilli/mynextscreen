import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupCard } from './screen-group-card';
import { ScreenGroup, ScreenGroupScreen } from './screen-group.model';

function makeScreen(id: string): ScreenGroupScreen {
  return {
    id,
    name: `S${id}`,
    location: 'Hall',
    resolution: '1920x1080',
    isOnline: false,
    groupId: 'g1',
    gridRow: null,
    gridColumn: null,
  };
}

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: 'org1',
    name: 'Lobby Wall',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    color: '#0ea5e9',
    icon: 'Groups',
    screens: [],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScreenGroupCard', () => {
  let fixture: ComponentFixture<ScreenGroupCard>;
  let component: ScreenGroupCard;

  async function setUp(group: ScreenGroup): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupCard],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('group', group);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('renders the group name and screen count', async () => {
    await setUp(makeGroup({ screens: [makeScreen('a'), makeScreen('b')] }));

    expect(fixture.nativeElement.textContent).toContain('Lobby Wall');
    expect(fixture.nativeElement.textContent).toContain('2 screens');
  });

  it('singularises the screen count', async () => {
    await setUp(makeGroup({ screens: [makeScreen('a')] }));
    expect(component.screenCount()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('1 screen');
  });

  it('labels a split group with its grid size', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 3, gridRows: 2 }));
    expect(component.modeLabel()).toBe('3×2');
  });

  it('labels a mirror group as Mirror', async () => {
    await setUp(makeGroup({ mode: 'mirror' }));
    expect(component.modeLabel()).toBe('Mirror');
  });

  it('builds a gradient from the group colour', async () => {
    await setUp(makeGroup({ color: '#ec4899' }));
    expect(component.gradient()).toContain('#ec4899');
  });

  it('falls back to the Groups icon for an unknown icon', async () => {
    await setUp(makeGroup({ icon: 'NotAnIcon' }));
    expect(component.iconName()).toBe('Groups');
  });

  it('shows a "No screens" frame when the group is empty', async () => {
    await setUp(makeGroup({ screens: [] }));
    expect(component.mirrorCount()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No screens');
  });

  it('caps the mirror stack at three layers', async () => {
    await setUp(makeGroup({ screens: Array.from({ length: 6 }, (_, i) => makeScreen(`s${i}`)) }));
    expect(component.mirrorCount()).toBe(3);
    expect(component.mirrorLayers()).toEqual([0, 1, 2]);
  });

  it('marks split cells that hold a screen as assigned', async () => {
    const at = (id: string, r: number, c: number, online = false): ScreenGroupScreen => ({
      ...makeScreen(id),
      isOnline: online,
      gridRow: r,
      gridColumn: c,
    });
    await setUp(
      makeGroup({
        mode: 'split',
        gridColumns: 2,
        gridRows: 2,
        screens: [at('a', 0, 0, true), at('b', 1, 1)],
      }),
    );
    // Row-major over the 2×2 grid: (0,0) and (1,1) are filled.
    expect(component.splitCells().map((c) => c.assigned)).toEqual([true, false, false, true]);
  });

  it('exposes online status and panel numbers for split cells', async () => {
    const at = (id: string, r: number, c: number, online: boolean): ScreenGroupScreen => ({
      ...makeScreen(id),
      isOnline: online,
      gridRow: r,
      gridColumn: c,
    });
    await setUp(
      makeGroup({ mode: 'split', gridColumns: 2, gridRows: 1, screens: [at('a', 0, 0, true)] }),
    );
    const cells = component.splitCells();
    expect(cells.map((c) => c.panel)).toEqual([1, 2]);
    expect(cells[0].online).toBe(true);
    expect(cells[1].assigned).toBe(false);
  });

  it('shows the full grid up to the 4×4 wall maximum', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 4, gridRows: 4 }));
    expect(component.displayCols()).toBe(4);
    expect(component.displayRows()).toBe(4);
    expect(component.splitCells().length).toBe(16);
  });

  it('caps an oversized grid at 4×4 and numbers panels by the full width', async () => {
    // 6 real columns capped to 4 shown: row 1 still starts at the real panel 7.
    await setUp(makeGroup({ mode: 'split', gridColumns: 6, gridRows: 2 }));
    expect(component.displayCols()).toBe(4);
    expect(component.displayRows()).toBe(2);
    const cells = component.splitCells();
    expect(cells.length).toBe(8);
    expect(cells.map((c) => c.panel)).toEqual([1, 2, 3, 4, 7, 8, 9, 10]);
  });

  it('hides per-cell meta when the grid is too tall to read', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 4 }));
    expect(component.showCellMeta()).toBe(false);
  });

  it('shows per-cell meta for short grids', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 4, gridRows: 2 }));
    expect(component.showCellMeta()).toBe(true);
  });

  it('emits open with the group when clicked', async () => {
    const group = makeGroup();
    await setUp(group);
    let opened: ScreenGroup | undefined;
    component.open.subscribe((g) => (opened = g));

    fixture.nativeElement.querySelector('[role="button"]').click();

    expect(opened).toBe(group);
  });

  it('emits delete from the trash button without opening', async () => {
    const group = makeGroup();
    await setUp(group);
    let deleted: ScreenGroup | undefined;
    let opened: ScreenGroup | undefined;
    component.delete.subscribe((g) => (deleted = g));
    component.open.subscribe((g) => (opened = g));

    fixture.nativeElement.querySelector('button[aria-label^="Delete"]').click();

    expect(deleted).toBe(group);
    expect(opened).toBeUndefined();
  });
});
