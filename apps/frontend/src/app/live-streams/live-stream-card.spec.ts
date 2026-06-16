import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamCard } from './live-stream-card';
import { LiveStream } from './live-stream.model';

function makeStream(overrides: Partial<LiveStream> = {}): LiveStream {
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
    ...overrides,
  };
}

describe('LiveStreamCard', () => {
  let fixture: ComponentFixture<LiveStreamCard>;
  let component: LiveStreamCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStreamCard],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamCard);
    component = fixture.componentInstance;
  });

  function configure(overrides: Partial<LiveStream> = {}): void {
    fixture.componentRef.setInput('stream', makeStream(overrides));
    fixture.detectChanges();
  }

  it('renders the stream name and source url', () => {
    configure();
    expect(fixture.debugElement.query(By.css('.name')).nativeElement.textContent.trim()).toBe(
      'Main Stage',
    );
    expect(fixture.debugElement.query(By.css('.source')).nativeElement.textContent.trim()).toBe(
      'rtmp://source/live',
    );
  });

  it('shows an Offline status and "Go live" footer button when idle', () => {
    configure({ status: 'idle' });
    expect(
      fixture.debugElement.query(By.css('.status-text')).nativeElement.textContent.trim(),
    ).toBe('Offline');
    expect(fixture.nativeElement.textContent).toContain('Go live');
  });

  it('shows a Live status and "Stop" footer button when active', () => {
    configure({ status: 'active' });
    expect(
      fixture.debugElement.query(By.css('.status-text')).nativeElement.textContent.trim(),
    ).toBe('Live');
    expect(fixture.nativeElement.textContent).toContain('Stop');
  });

  it('surfaces an error hint when status is error', () => {
    configure({ status: 'error' });
    expect(fixture.debugElement.query(By.css('.error-hint'))).not.toBeNull();
  });

  it('emits open when the title column is clicked', () => {
    configure();
    const spy = vi.fn();
    component.open.subscribe(spy);
    fixture.debugElement.query(By.css('.title-col')).nativeElement.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits goToggle from the footer button', () => {
    configure();
    const spy = vi.fn();
    component.goToggle.subscribe(spy);
    fixture.debugElement.query(By.css('.footer button')).nativeElement.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('opens the actions menu and emits delete', () => {
    configure();
    const spy = vi.fn();
    component.delete.subscribe(spy);

    fixture.debugElement.query(By.css('.menu-btn')).nativeElement.click();
    fixture.detectChanges();

    const deleteItem = fixture.debugElement
      .queryAll(By.css('.menu-item'))
      .find((b) => b.nativeElement.textContent.includes('Delete'));
    deleteItem!.nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits open from the "Open console" menu item', () => {
    configure();
    const spy = vi.fn();
    component.open.subscribe(spy);

    fixture.debugElement.query(By.css('.menu-btn')).nativeElement.click();
    fixture.detectChanges();

    const openItem = fixture.debugElement
      .queryAll(By.css('.menu-item'))
      .find((b) => b.nativeElement.textContent.includes('Open console'));
    openItem!.nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
