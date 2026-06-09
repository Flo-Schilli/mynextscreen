import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenAssignGroupModal } from './screen-assign-group-modal';
import { ScreenGroup } from '../screen-groups/screen-group.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

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

describe('ScreenAssignGroupModal', () => {
  let fixture: ComponentFixture<ScreenAssignGroupModal>;

  async function setUp(opts: {
    groups?: ScreenGroup[];
    loading?: boolean;
    loadError?: string;
    count?: number;
  }): Promise<void> {
    fixture = TestBed.createComponent(ScreenAssignGroupModal);
    fixture.componentRef.setInput('groups', opts.groups ?? []);
    fixture.componentRef.setInput('loading', opts.loading ?? false);
    fixture.componentRef.setInput('loadError', opts.loadError ?? '');
    fixture.componentRef.setInput('count', opts.count ?? 0);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function byText(text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders the selection count', async () => {
    await setUp({ count: 3 });

    expect(fixture.nativeElement.querySelector('p strong').textContent).toContain('3 screen(s)');
  });

  it('renders the "no group" option plus one option per group', async () => {
    await setUp({ groups: [makeGroup(), makeGroup({ id: 'g2', name: 'Bar Wall' })] });

    const options = fixture.debugElement.queryAll(By.css('option'));
    expect(options.length).toBe(3);
    expect(options[0].nativeElement.value).toBe('');
    expect(options[1].nativeElement.textContent.trim()).toBe('Lobby Wall');
    expect(options[2].nativeElement.textContent.trim()).toBe('Bar Wall');
  });

  it('updates the selectedGroupId model when the user picks a group', async () => {
    await setUp({ groups: [makeGroup({ id: 'g2', name: 'Bar Wall' })] });

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#groupSelect');
    select.value = 'g2';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedGroupId()).toBe('g2');
  });

  it('shows the load error when one is provided', async () => {
    await setUp({ loadError: 'Failed to load groups.' });

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Failed to load groups.',
    );
  });

  it('hides the error paragraph when there is no load error', async () => {
    await setUp({ loadError: '' });

    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('disables the assign button and shows "Loading..." while loading', async () => {
    await setUp({ loading: true });

    const assignBtn = byText('Loading...');
    expect(assignBtn).toBeTruthy();
    expect(assignBtn.disabled).toBe(true);
  });

  it('emits confirm when Assign is clicked', async () => {
    await setUp({ loading: false });
    const spy = vi.fn();
    fixture.componentInstance.confirm.subscribe(spy);

    byText('Assign').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when Cancel is clicked', async () => {
    await setUp({});
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    byText('Cancel').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay backdrop is clicked', async () => {
    await setUp({});
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
