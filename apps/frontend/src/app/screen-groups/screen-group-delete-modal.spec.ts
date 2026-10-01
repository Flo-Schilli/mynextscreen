import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupDeleteModal } from './screen-group-delete-modal';
import { ScreenGroup, ScreenGroupScreen } from './screen-group.model';

function makeScreen(id: string): ScreenGroupScreen {
  return {
    id,
    name: `Screen ${id}`,
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
    name: 'Lobby',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    color: '#6d6cf6',
    icon: 'Groups',
    screens: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buttonByText(el: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(el.querySelectorAll('button')).find(
    (b) => (b as HTMLElement).textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;
}

describe('ScreenGroupDeleteModal', () => {
  let fixture: ComponentFixture<ScreenGroupDeleteModal>;
  let component: ScreenGroupDeleteModal;

  async function setUp(
    group: ScreenGroup = makeGroup(),
    deleting = false,
    error = '',
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupDeleteModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupDeleteModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('deleting', deleting);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('blocks deletion and explains why when the group still has screens', async () => {
    await setUp(makeGroup({ name: 'Busy', screens: [makeScreen('s1'), makeScreen('s2')] }));

    expect(fixture.nativeElement.textContent).toContain('Busy');
    expect(fixture.nativeElement.textContent).toContain('2 assigned screen(s)');
    expect(buttonByText(fixture.nativeElement, 'Delete')).toBeUndefined();
    expect(buttonByText(fixture.nativeElement, 'Close')).toBeDefined();
  });

  it('emits dismiss when Close is clicked in the blocked state', async () => {
    await setUp(makeGroup({ screens: [makeScreen('s1')] }));
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    buttonByText(fixture.nativeElement, 'Close')!.click();

    expect(dismissed).toBe(true);
  });

  it('asks for confirmation when the group has no screens', async () => {
    await setUp(makeGroup({ name: 'Empty', screens: [] }));

    expect(buttonByText(fixture.nativeElement, 'Delete')).toBeDefined();
    expect(fixture.nativeElement.textContent).toContain('Empty');
  });

  it('emits confirm when the Delete button is clicked', async () => {
    await setUp(makeGroup({ screens: [] }));
    let confirmed = false;
    component.confirm.subscribe(() => (confirmed = true));

    buttonByText(fixture.nativeElement, 'Delete')!.click();

    expect(confirmed).toBe(true);
  });

  it('shows a busy label while deleting', async () => {
    await setUp(makeGroup({ screens: [] }), true);

    expect(buttonByText(fixture.nativeElement, 'Deleting…')).toBeDefined();
  });

  it('renders the parent-provided error in the confirm state', async () => {
    await setUp(makeGroup({ screens: [] }), false, 'Delete failed');

    expect(fixture.nativeElement.textContent).toContain('Delete failed');
  });

  it('emits dismiss when Cancel is clicked in the confirm state', async () => {
    await setUp(makeGroup({ screens: [] }));
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    buttonByText(fixture.nativeElement, 'Cancel')!.click();

    expect(dismissed).toBe(true);
  });

  it('emits dismiss when the overlay backdrop is clicked', async () => {
    await setUp(makeGroup({ screens: [] }));
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const backdrop = fixture.nativeElement.querySelector('mns-overlay > div');
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dismissed).toBe(true);
  });
});
