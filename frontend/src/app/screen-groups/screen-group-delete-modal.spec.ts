import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupDeleteModal } from './screen-group-delete-modal';
import { ScreenGroup, ScreenGroupScreen } from './screen-group.model';

function makeScreen(id: string): ScreenGroupScreen {
  return {
    id,
    name: `Screen ${id}`,
    location: 'Hall',
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
    screens: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
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

    const blocked = fixture.nativeElement.querySelector('.delete-blocked');
    expect(blocked).not.toBeNull();
    expect(blocked.textContent).toContain('Busy');
    expect(blocked.textContent).toContain('2 assigned screen(s)');
    // Confirm/Delete button must not exist in the blocked state.
    expect(fixture.nativeElement.querySelector('.btn-danger')).toBeNull();
  });

  it('shows only a Close button in the blocked state which emits dismiss', async () => {
    await setUp(makeGroup({ screens: [makeScreen('s1')] }));
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const closeBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Close',
    ) as HTMLButtonElement;
    closeBtn.click();

    expect(dismissed).toBe(true);
  });

  it('asks for confirmation when the group has no screens', async () => {
    await setUp(makeGroup({ name: 'Empty', screens: [] }));

    expect(fixture.nativeElement.querySelector('.delete-blocked')).toBeNull();
    const danger: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-danger');
    expect(danger).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Empty');
  });

  it('emits confirm when the Delete button is clicked', async () => {
    await setUp(makeGroup({ screens: [] }));
    let confirmed = false;
    component.confirm.subscribe(() => (confirmed = true));

    fixture.debugElement.query(By.css('.btn-danger')).nativeElement.click();

    expect(confirmed).toBe(true);
  });

  it('disables the Delete button and shows a busy label while deleting', async () => {
    await setUp(makeGroup({ screens: [] }), true);

    const danger: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-danger');
    expect(danger.disabled).toBe(true);
    expect(danger.textContent?.trim()).toBe('Deleting...');
  });

  it('renders the parent-provided error in the confirm state', async () => {
    await setUp(makeGroup({ screens: [] }), false, 'Delete failed');

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain('Delete failed');
  });

  it('emits dismiss when Cancel is clicked in the confirm state', async () => {
    await setUp(makeGroup({ screens: [] }));
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();

    expect(dismissed).toBe(true);
  });

  it('emits dismiss when the overlay is clicked', async () => {
    await setUp(makeGroup({ screens: [] }));
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    expect(dismissed).toBe(true);
  });
});
