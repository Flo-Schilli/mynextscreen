import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupCard } from './screen-group-card';
import { ScreenGroup, ScreenGroupScreen } from './screen-group.model';

function makeScreen(id: string): ScreenGroupScreen {
  return { id, name: `S${id}`, location: 'Hall', groupId: 'g1', gridRow: null, gridColumn: null };
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

  it('shows two placeholders in the strip when there are no screens', async () => {
    await setUp(makeGroup({ screens: [] }));
    expect(component.strip()).toEqual([null, null]);
  });

  it('caps the preview strip at four screens', async () => {
    await setUp(makeGroup({ screens: Array.from({ length: 6 }, (_, i) => makeScreen(`s${i}`)) }));
    expect(component.strip().length).toBe(4);
  });

  it('emits open with the group when clicked', async () => {
    const group = makeGroup();
    await setUp(group);
    let opened: ScreenGroup | undefined;
    component.open.subscribe((g) => (opened = g));

    fixture.nativeElement.querySelector('[role="button"]').click();

    expect(opened).toBe(group);
  });
});
