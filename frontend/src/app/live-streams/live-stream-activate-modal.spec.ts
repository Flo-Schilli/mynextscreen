import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamActivateModal } from './live-stream-activate-modal';
import { ActivateLiveStreamRequest, LiveStream } from './live-stream.model';
import { Screen } from '../screens/screen.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';

async function flush(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await f.whenStable();
  f.detectChanges();
}

function makeStream(): LiveStream {
  return {
    id: 'ls-1',
    organisationId: 'org1',
    name: 'Main Stage',
    sourceUrl: 'rtmp://source/live',
    protocol: 'rtmp',
    status: 'idle',
    transcodingPreset: 'high_1080p',
    audioEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeScreen(id: string, name: string, location = ''): Screen {
  return {
    id,
    organisationId: 'org1',
    name,
    resolution: '1920x1080',
    location,
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeGroup(id: string, name: string, screenCount: number): ScreenGroup {
  return {
    id,
    organisationId: 'org1',
    name,
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    screens: Array.from({ length: screenCount }, (_, i) => ({
      id: `${id}-s${i}`,
      name: `s${i}`,
      location: '',
      groupId: id,
      gridRow: null,
      gridColumn: null,
    })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('LiveStreamActivateModal', () => {
  let fixture: ComponentFixture<LiveStreamActivateModal>;
  let component: LiveStreamActivateModal;

  function configure(opts: {
    screens?: Screen[];
    groups?: ScreenGroup[];
    activating?: boolean;
    error?: string;
  }): void {
    fixture.componentRef.setInput('stream', makeStream());
    fixture.componentRef.setInput('screens', opts.screens ?? []);
    fixture.componentRef.setInput('screenGroups', opts.groups ?? []);
    fixture.componentRef.setInput('activating', opts.activating ?? false);
    fixture.componentRef.setInput('error', opts.error ?? '');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStreamActivateModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamActivateModal);
    component = fixture.componentInstance;
  });

  it('renders the stream name in the heading', () => {
    // Arrange / Act
    configure({});

    // Assert
    expect(fixture.debugElement.query(By.css('h2')).nativeElement.textContent).toContain(
      'Main Stage',
    );
  });

  it('defaults to the screens target type and lists screens with their location', () => {
    // Arrange / Act
    configure({ screens: [makeScreen('s1', 'Lobby', 'Foyer')] });

    // Assert
    const labels = fixture.debugElement.queryAll(By.css('.checkbox-list .checkbox-label'));
    expect(labels.length).toBe(1);
    expect(labels[0].nativeElement.textContent).toContain('Lobby');
    expect(labels[0].nativeElement.textContent).toContain('(Foyer)');
  });

  it('shows an empty message when no screens are available', () => {
    // Arrange / Act
    configure({ screens: [] });

    // Assert
    expect(fixture.debugElement.query(By.css('.text-muted')).nativeElement.textContent).toContain(
      'No screens available.',
    );
  });

  it('toggleScreen adds then removes a screen id from the selection', () => {
    // Arrange
    configure({ screens: [makeScreen('s1', 'Lobby')] });

    // Act / Assert
    component.toggleScreen('s1');
    expect(component['selectedScreenIds'].has('s1')).toBe(true);
    component.toggleScreen('s1');
    expect(component['selectedScreenIds'].has('s1')).toBe(false);
  });

  it('blocks submit and shows a local error when no screens are selected', () => {
    // Arrange
    configure({ screens: [makeScreen('s1', 'Lobby')] });
    const spy = vi.fn();
    component.activate.subscribe(spy);

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Select at least one screen.',
    );
  });

  it('emits targetScreenIds when one or more screens are selected', () => {
    // Arrange
    configure({ screens: [makeScreen('s1', 'Lobby'), makeScreen('s2', 'Hall')] });
    let emitted: ActivateLiveStreamRequest | undefined;
    component.activate.subscribe((dto) => (emitted = dto));
    component.toggleScreen('s1');
    component.toggleScreen('s2');

    // Act
    component.onSubmit();

    // Assert
    expect(emitted).toEqual({ targetScreenIds: ['s1', 's2'] });
  });

  it('renders the group select after switching target type to group', async () => {
    // Arrange
    configure({ groups: [makeGroup('g1', 'Wall', 4)] });
    const groupRadio = fixture.debugElement
      .queryAll(By.css('input[type="radio"]'))
      .find((d) => d.nativeElement.value === 'group');

    // Act
    groupRadio!.nativeElement.click();
    await flush(fixture);

    // Assert
    expect(fixture.debugElement.query(By.css('#activateGroupId'))).not.toBeNull();
    const options = fixture.debugElement.queryAll(By.css('#activateGroupId option'));
    expect(options.some((o) => o.nativeElement.textContent.includes('Wall (4 screens)'))).toBe(
      true,
    );
  });

  it('blocks submit and shows a local error when group type chosen but no group selected', () => {
    // Arrange
    configure({ groups: [makeGroup('g1', 'Wall', 2)] });
    component['targetType'] = 'group';
    const spy = vi.fn();
    component.activate.subscribe(spy);

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(component['localError']()).toBe('Select a screen group.');
  });

  it('emits targetGroupId when a group is selected', () => {
    // Arrange
    configure({ groups: [makeGroup('g1', 'Wall', 2)] });
    component['targetType'] = 'group';
    component['groupId'] = 'g1';
    let emitted: ActivateLiveStreamRequest | undefined;
    component.activate.subscribe((dto) => (emitted = dto));

    // Act
    component.onSubmit();

    // Assert
    expect(emitted).toEqual({ targetGroupId: 'g1' });
  });

  it('shows the parent error when no local error is present', () => {
    // Arrange / Act
    configure({ error: 'Activation failed.' });

    // Assert
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Activation failed.',
    );
  });

  it('disables activate and shows "Activating..." while activating', () => {
    // Arrange / Act
    configure({ activating: true });

    // Assert
    const button = fixture.debugElement.query(By.css('.btn-primary'));
    expect(button.nativeElement.disabled).toBe(true);
    expect(button.nativeElement.textContent.trim()).toBe('Activating...');
  });

  it('emits dismiss when cancel is clicked', () => {
    // Arrange
    configure({});
    const spy = vi.fn();
    component.dismiss.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
