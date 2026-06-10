import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupTable } from './screen-group-table';
import { ScreenGroup } from './screen-group.model';

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: 'org1',
    name: 'Lobby Wall',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    screens: [],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScreenGroupTable', () => {
  let fixture: ComponentFixture<ScreenGroupTable>;

  function setUp(groups: ScreenGroup[]): void {
    fixture = TestBed.createComponent(ScreenGroupTable);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupTable],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders one row per group', () => {
    setUp([makeGroup({ id: 'g1' }), makeGroup({ id: 'g2', name: 'Foyer' })]);
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
  });

  it('shows a Mirror badge for mirror groups', () => {
    setUp([makeGroup({ mode: 'mirror' })]);
    const badge = fixture.debugElement.query(By.css('.mode-badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('Mirror');
    expect(badge.nativeElement.classList.contains('mirror')).toBe(true);
  });

  it('shows a Split badge for split groups', () => {
    setUp([makeGroup({ mode: 'split', gridColumns: 3, gridRows: 2 })]);
    const badge = fixture.debugElement.query(By.css('.mode-badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('Split');
    expect(badge.nativeElement.classList.contains('split')).toBe(true);
  });

  it('renders the grid size for split groups with dimensions', () => {
    setUp([makeGroup({ mode: 'split', gridColumns: 4, gridRows: 2 })]);
    const gridCell = fixture.debugElement.queryAll(By.css('tbody td'))[2];
    expect(gridCell.nativeElement.textContent.trim()).toBe('4x2');
  });

  it('renders a dash for the grid size of mirror groups', () => {
    setUp([makeGroup({ mode: 'mirror' })]);
    const gridCell = fixture.debugElement.queryAll(By.css('tbody td'))[2];
    expect(gridCell.nativeElement.textContent.trim()).toBe('-');
  });

  it('renders a dash when a split group is missing grid dimensions', () => {
    setUp([makeGroup({ mode: 'split', gridColumns: null, gridRows: null })]);
    const gridCell = fixture.debugElement.queryAll(By.css('tbody td'))[2];
    expect(gridCell.nativeElement.textContent.trim()).toBe('-');
  });

  it('renders the screen count', () => {
    const screens = [
      { id: 's1', name: 'A', location: 'L', groupId: 'g1', gridRow: null, gridColumn: null },
      { id: 's2', name: 'B', location: 'L', groupId: 'g1', gridRow: null, gridColumn: null },
    ];
    setUp([makeGroup({ screens })]);
    const countCell = fixture.debugElement.queryAll(By.css('tbody td'))[3];
    expect(countCell.nativeElement.textContent.trim()).toBe('2');
  });

  it('emits view with the group when the name link is clicked', () => {
    const group = makeGroup();
    setUp([group]);
    const spy = vi.fn();
    fixture.componentInstance.view.subscribe(spy);

    fixture.debugElement.query(By.css('.group-link')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith(group);
  });

  it('emits view when Enter is pressed on the name link', () => {
    const group = makeGroup();
    setUp([group]);
    const spy = vi.fn();
    fixture.componentInstance.view.subscribe(spy);

    const link = fixture.debugElement.query(By.css('.group-link'));
    link.triggerEventHandler('keydown.enter', {});

    expect(spy).toHaveBeenCalledWith(group);
  });

  it('emits edit when the Edit button is clicked', () => {
    const group = makeGroup();
    setUp([group]);
    const spy = vi.fn();
    fixture.componentInstance.edit.subscribe(spy);

    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith(group);
  });

  it('emits delete when the Delete button is clicked', () => {
    const group = makeGroup();
    setUp([group]);
    const spy = vi.fn();
    fixture.componentInstance.delete.subscribe(spy);

    fixture.debugElement.query(By.css('.btn-danger')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith(group);
  });

  it('renders an empty tbody when there are no groups', () => {
    setUp([]);
    expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(0);
  });
});
