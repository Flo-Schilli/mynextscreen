import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamMonitor } from './live-stream-monitor';
import { LiveStreamStatus } from './live-stream.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

describe('LiveStreamMonitor', () => {
  let fixture: ComponentFixture<LiveStreamMonitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LiveStreamMonitor,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamMonitor);
  });

  function configure(status: LiveStreamStatus, audioEnabled = true): void {
    fixture.componentRef.setInput('streamId', 'ls-1');
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('transcodingPreset', 'high_1080p');
    fixture.componentRef.setInput('audioEnabled', audioEnabled);
    fixture.detectChanges();
  }

  it('shows the LIVE pill and no NO-SIGNAL overlay when active', () => {
    configure('active');
    expect(fixture.debugElement.query(By.css('.live-pill'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.no-signal'))).toBeNull();
  });

  it('shows NO SIGNAL when idle', () => {
    configure('idle');
    const overlay = fixture.debugElement.query(By.css('.no-signal-label'));
    expect(overlay).not.toBeNull();
    expect(overlay.nativeElement.textContent.trim()).toBe('NO SIGNAL');
    expect(fixture.debugElement.query(By.css('.live-pill'))).toBeNull();
  });

  it('shows a STREAM ERROR label when status is error', () => {
    configure('error');
    expect(
      fixture.debugElement.query(By.css('.no-signal-label')).nativeElement.textContent.trim(),
    ).toBe('STREAM ERROR');
  });

  it('shows the MUTED badge only when live and audio disabled', () => {
    configure('active', false);
    expect(fixture.debugElement.query(By.css('.muted-pill'))).not.toBeNull();

    configure('active', true);
    expect(fixture.debugElement.query(By.css('.muted-pill'))).toBeNull();
  });

  it('derives a deterministic gradient from the stream id', () => {
    configure('active');
    const a = fixture.debugElement.query(By.css('.monitor')).nativeElement.style.background;

    fixture.componentRef.setInput('streamId', 'ls-1');
    fixture.detectChanges();
    const b = fixture.debugElement.query(By.css('.monitor')).nativeElement.style.background;
    expect(a).toBe(b);
    expect(a).toContain('linear-gradient');
  });

  it('applies the big modifier class when big', () => {
    configure('active');
    expect(fixture.debugElement.query(By.css('.monitor.big'))).toBeNull();

    fixture.componentRef.setInput('big', true);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.monitor.big'))).not.toBeNull();
  });
});
