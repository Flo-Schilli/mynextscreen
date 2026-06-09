import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupMirrorList } from './screen-group-mirror-list';
import { ScreenGroupScreen } from './screen-group.model';

function makeScreen(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 's1',
    name: 'Screen One',
    location: 'Lobby',
    groupId: 'g1',
    gridRow: null,
    gridColumn: null,
    ...overrides,
  };
}

describe('ScreenGroupMirrorList', () => {
  let fixture: ComponentFixture<ScreenGroupMirrorList>;

  function setUp(screens: ScreenGroupScreen[], operationInProgress = false): void {
    fixture = TestBed.createComponent(ScreenGroupMirrorList);
    fixture.componentRef.setInput('screens', screens);
    fixture.componentRef.setInput('operationInProgress', operationInProgress);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupMirrorList],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('shows the assigned-screen count in the header', () => {
    setUp([makeScreen({ id: 's1' }), makeScreen({ id: 's2' })]);
    const title = fixture.debugElement.query(By.css('.section-title'));
    expect(title.nativeElement.textContent).toContain('Assigned Screens (2)');
  });

  it('renders the empty state when there are no screens', () => {
    setUp([]);
    expect(fixture.debugElement.query(By.css('.mirror-empty'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.mirror-list'))).toBeNull();
  });

  it('renders the screen list when screens are assigned', () => {
    setUp([makeScreen({ name: 'Screen One', location: 'Lobby' })]);
    expect(fixture.debugElement.query(By.css('.mirror-empty'))).toBeNull();
    expect(
      fixture.debugElement.query(By.css('.mirror-screen-name')).nativeElement.textContent,
    ).toContain('Screen One');
    expect(
      fixture.debugElement.query(By.css('.mirror-screen-location')).nativeElement.textContent,
    ).toContain('Lobby');
  });

  it('renders one row per screen', () => {
    setUp([makeScreen({ id: 's1' }), makeScreen({ id: 's2' }), makeScreen({ id: 's3' })]);
    expect(fixture.debugElement.queryAll(By.css('.mirror-screen')).length).toBe(3);
  });

  it('emits addScreen when the header add button is clicked', () => {
    setUp([makeScreen()]);
    const spy = vi.fn();
    fixture.componentInstance.addScreen.subscribe(spy);

    fixture.debugElement.query(By.css('.mirror-header .btn-primary')).nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits addScreen when the empty-state add button is clicked', () => {
    setUp([]);
    const spy = vi.fn();
    fixture.componentInstance.addScreen.subscribe(spy);

    fixture.debugElement.query(By.css('.mirror-empty .btn-primary')).nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits removeScreen with the screen id when Remove is clicked', () => {
    setUp([makeScreen({ id: 's42' })]);
    const spy = vi.fn();
    fixture.componentInstance.removeScreen.subscribe(spy);

    fixture.debugElement.query(By.css('.btn-danger')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith('s42');
  });

  it('disables the Remove button while an operation is in progress', () => {
    setUp([makeScreen()], true);
    const button = fixture.debugElement.query(By.css('.btn-danger')).nativeElement;
    expect(button.disabled).toBe(true);
  });

  it('enables the Remove button when no operation is in progress', () => {
    setUp([makeScreen()], false);
    const button = fixture.debugElement.query(By.css('.btn-danger')).nativeElement;
    expect(button.disabled).toBe(false);
  });
});
