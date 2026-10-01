import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupWall, WallCell, WallAssignEvent, WallPlaceable } from './screen-group-wall';
import { ScreenGroupScreen } from './screen-group.model';

function cell(
  idx: number,
  row: number,
  col: number,
  screen: ScreenGroupScreen | null = null,
): WallCell {
  return { idx, row, col, screen };
}

function assigned(id: string, gridRow: number, gridColumn: number): ScreenGroupScreen {
  return {
    id,
    name: `S${id}`,
    location: 'Hall',
    resolution: '1920x1080',
    isOnline: false,
    groupId: 'g1',
    gridRow,
    gridColumn,
  };
}

const PLACEABLE: WallPlaceable[] = [
  { id: 's1', name: 'One', location: 'A', status: 'online' },
  { id: 's2', name: 'Two', location: 'B', status: 'offline' },
];

describe('ScreenGroupWall', () => {
  let fixture: ComponentFixture<ScreenGroupWall>;
  let component: ScreenGroupWall;

  async function setUp(inputs: Record<string, unknown>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupWall],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupWall);
    component = fixture.componentInstance;
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('renders one frame per cell in split mode', async () => {
    await setUp({
      mode: 'split',
      cols: 2,
      rows: 1,
      cells: [cell(0, 0, 0), cell(1, 0, 1)],
      placeable: PLACEABLE,
    });

    expect(fixture.nativeElement.querySelectorAll('app-screen-group-monitor-frame').length).toBe(2);
  });

  it('opens and closes a cell popover on the hit-area toggle', async () => {
    await setUp({ mode: 'split', cols: 1, rows: 1, cells: [cell(0, 0, 0)], placeable: PLACEABLE });

    component.toggle(0);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.popover')).not.toBeNull();

    component.close();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.popover')).toBeNull();
  });

  it('emits an assign event for a chosen screen', async () => {
    await setUp({ mode: 'split', cols: 1, rows: 1, cells: [cell(0, 0, 0)], placeable: PLACEABLE });
    let emitted: WallAssignEvent | undefined;
    component.assign.subscribe((e) => (emitted = e));

    component.assignTo(cell(0, 0, 0), 's1');

    expect(emitted).toEqual({ row: 0, col: 0, idx: 0, screenId: 's1' });
    expect(component.openCell()).toBeNull();
  });

  it('emits a null screen id when leaving a cell empty', async () => {
    const occupied = cell(0, 0, 0, assigned('s1', 0, 0));
    await setUp({ mode: 'split', cols: 1, rows: 1, cells: [occupied], placeable: PLACEABLE });
    let emitted: WallAssignEvent | undefined;
    component.assign.subscribe((e) => (emitted = e));

    component.leaveEmpty(occupied);

    expect(emitted).toEqual({ row: 0, col: 0, idx: 0, screenId: null });
  });

  it('excludes screens already placed in other cells from a cell menu', async () => {
    const c0 = cell(0, 0, 0, assigned('s1', 0, 0));
    const c1 = cell(1, 0, 1);
    await setUp({ mode: 'split', cols: 2, rows: 1, cells: [c0, c1], placeable: PLACEABLE });

    // For the empty cell, s1 (placed in c0) is excluded.
    expect(component.placeableFor(c1).map((s) => s.id)).toEqual(['s2']);
    // For the occupied cell, its own screen remains selectable.
    expect(component.placeableFor(c0).map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('opens the popover upward for the bottom row of a multi-row wall', async () => {
    await setUp({ mode: 'split', cols: 1, rows: 2, cells: [cell(0, 0, 0), cell(1, 1, 0)] });
    expect(component.isUpward(cell(1, 1, 0))).toBe(true);
    expect(component.isUpward(cell(0, 0, 0))).toBe(false);
  });

  it('renders mirror frames without popovers', async () => {
    await setUp({
      mode: 'mirror',
      mirrorScreens: [assigned('s1', 0, 0)],
      placeable: PLACEABLE,
    });

    expect(fixture.nativeElement.querySelector('.popover')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-screen-group-monitor-frame').length).toBe(1);
  });
});
