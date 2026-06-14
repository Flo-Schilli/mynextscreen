import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGrid } from './screen-grid';
import { Screen } from './screen.model';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Main Stage',
    resolution: '1920x1080',
    location: 'Hall A',
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

describe('ScreenGrid', () => {
  let fixture: ComponentFixture<ScreenGrid>;
  let selection: SelectionService;

  const bulkActions: BulkAction[] = [
    { label: 'Delete selected', variant: 'danger', handler: () => undefined },
  ];

  async function setUp(screens: Screen[]): Promise<void> {
    fixture = TestBed.createComponent(ScreenGrid);
    selection = fixture.componentRef.injector.get(SelectionService);
    fixture.componentRef.setInput('screens', screens);
    fixture.componentRef.setInput(
      'screenIds',
      screens.map((s) => s.id),
    );
    fixture.componentRef.setInput('bulkActions', bulkActions);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), SelectionService],
    });
  });

  it('renders one card per screen', async () => {
    await setUp([makeScreen(), makeScreen({ id: 's2', name: 'Bar TV' })]);

    expect(fixture.debugElement.queryAll(By.css('.screen-card')).length).toBe(2);
  });

  it('renders the screen name, location, resolution and status text', async () => {
    await setUp([makeScreen({ isOnline: true })]);

    const card = fixture.debugElement.query(By.css('.screen-card')).nativeElement;
    expect(card.querySelector('.screen-name').textContent).toContain('Main Stage');
    expect(card.textContent).toContain('Hall A');
    expect(card.textContent).toContain('1920x1080');
    expect(card.querySelector('.status-text').textContent.trim()).toBe('Online');
  });

  it('marks the status dot online for an online screen', async () => {
    await setUp([makeScreen({ isOnline: true })]);

    const dot = fixture.debugElement.query(By.css('.card-header .status-dot')).nativeElement;
    expect(dot.classList).toContain('online');
    expect(dot.getAttribute('title')).toBe('Online');
  });

  it('marks the status dot offline for an offline screen', async () => {
    await setUp([makeScreen({ isOnline: false })]);

    const dot = fixture.debugElement.query(By.css('.card-header .status-dot')).nativeElement;
    expect(dot.classList).toContain('offline');
    expect(dot.getAttribute('title')).toBe('Offline');
    expect(
      fixture.debugElement.query(By.css('.status-text')).nativeElement.textContent.trim(),
    ).toBe('Offline');
  });

  it('emits the clicked screen on selectItem', async () => {
    const screen = makeScreen();
    await setUp([screen]);
    const spy = vi.fn();
    fixture.componentInstance.selectItem.subscribe(spy);

    fixture.debugElement.query(By.css('.screen-card')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith(screen);
  });

  it('emits the clicked screen when Enter is pressed on a card', async () => {
    const screen = makeScreen();
    await setUp([screen]);
    const spy = vi.fn();
    fixture.componentInstance.selectItem.subscribe(spy);

    fixture.debugElement
      .query(By.css('.screen-card'))
      .nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(spy).toHaveBeenCalledWith(screen);
  });

  it('applies the selected class when the screen is selected in the SelectionService', async () => {
    await setUp([makeScreen({ id: 's1' })]);

    selection.toggle('s1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('.screen-card')).nativeElement.classList).toContain(
      'selected',
    );
  });

  it('renders nothing in the grid when there are no screens', async () => {
    await setUp([]);

    expect(fixture.debugElement.queryAll(By.css('.screen-card')).length).toBe(0);
  });
});
