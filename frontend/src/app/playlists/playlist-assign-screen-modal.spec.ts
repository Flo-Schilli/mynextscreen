import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlaylistAssignScreenModal } from './playlist-assign-screen-modal';
import { Screen } from '../screens/screen.model';

function buildScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Lobby TV',
    resolution: '1920x1080',
    location: 'Lobby',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PlaylistAssignScreenModal', () => {
  let fixture: ComponentFixture<PlaylistAssignScreenModal>;
  let component: PlaylistAssignScreenModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistAssignScreenModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistAssignScreenModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('screens', []);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('loadError', '');
    fixture.componentRef.setInput('count', 2);
    fixture.componentRef.setInput('selectedScreenId', '');
  });

  it('renders the selected playlist count', () => {
    fixture.detectChanges();

    const strong = fixture.debugElement.query(By.css('strong'));
    expect(strong.nativeElement.textContent).toContain('2 playlist(s)');
  });

  it('renders one option per screen with name and location', () => {
    fixture.componentRef.setInput('screens', [
      buildScreen({ id: 's1', name: 'Lobby TV', location: 'Lobby' }),
      buildScreen({ id: 's2', name: 'Bar TV', location: 'Bar' }),
    ]);
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(By.css('option'));
    // placeholder + 2 screens
    expect(options.length).toBe(3);
    expect(options[1].nativeElement.textContent).toContain('Lobby TV (Lobby)');
    expect(options[2].nativeElement.textContent).toContain('Bar TV (Bar)');
  });

  it('disables the Assign button when no screen is selected', () => {
    fixture.detectChanges();

    const assign = fixture.debugElement.query(By.css('.btn-primary'));
    expect(assign.nativeElement.disabled).toBe(true);
  });

  it('disables the Assign button while loading', () => {
    fixture.componentRef.setInput('selectedScreenId', 's1');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const assign = fixture.debugElement.query(By.css('.btn-primary'));
    expect(assign.nativeElement.disabled).toBe(true);
    expect(assign.nativeElement.textContent).toContain('Loading...');
  });

  it('enables the Assign button when a screen is selected and not loading', () => {
    fixture.componentRef.setInput('selectedScreenId', 's1');
    fixture.detectChanges();

    const assign = fixture.debugElement.query(By.css('.btn-primary'));
    expect(assign.nativeElement.disabled).toBe(false);
    expect(assign.nativeElement.textContent).toContain('Assign');
  });

  it('shows the load error when present', () => {
    fixture.componentRef.setInput('loadError', 'Failed to load screens.');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Failed to load screens.',
    );
  });

  it('hides the error paragraph when loadError is empty', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();
  });

  it('emits confirm when Assign is clicked', () => {
    const spy = vi.fn();
    component.confirm.subscribe(spy);
    fixture.componentRef.setInput('selectedScreenId', 's1');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.btn-primary')).triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when Cancel is clicked', () => {
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.btn-secondary')).triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay is clicked', () => {
    const spy = vi.fn();
    component.dismiss.subscribe(spy);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.modal-overlay')).triggerEventHandler('click', undefined);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
