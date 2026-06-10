import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamTable } from './live-stream-table';
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

describe('LiveStreamTable', () => {
  let fixture: ComponentFixture<LiveStreamTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStreamTable],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamTable);
  });

  function setStreams(streams: LiveStream[]): void {
    fixture.componentRef.setInput('streams', streams);
    fixture.detectChanges();
  }

  it('renders one row per stream with name and source url', () => {
    // Arrange / Act
    setStreams([
      makeStream({ id: 'a', name: 'Alpha', sourceUrl: 'rtmp://a' }),
      makeStream({ id: 'b', name: 'Beta', sourceUrl: 'rtmp://b' }),
    ]);

    // Assert
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('Alpha');
    expect(rows[0].nativeElement.textContent).toContain('rtmp://a');
    expect(rows[1].nativeElement.textContent).toContain('Beta');
  });

  it('uppercases the protocol badge', () => {
    // Arrange / Act
    setStreams([makeStream({ protocol: 'rtp' })]);

    // Assert
    const badge = fixture.debugElement.query(By.css('.protocol-badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('RTP');
  });

  it('maps the transcoding preset to its human label', () => {
    // Arrange / Act
    setStreams([makeStream({ transcodingPreset: 'passthrough' })]);

    // Assert
    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    const qualityCell = cells[3];
    expect(qualityCell.nativeElement.textContent.trim()).toBe('Passthrough (no re-encode)');
  });

  it('applies the matching status class for an active stream', () => {
    // Arrange / Act
    setStreams([makeStream({ status: 'active' })]);

    // Assert
    const status = fixture.debugElement.query(By.css('.status-badge'));
    expect(status.classes['status-active']).toBe(true);
    expect(status.classes['status-idle']).toBeFalsy();
  });

  it('shows the health badge only when active and health present', () => {
    // Arrange / Act
    setStreams([
      makeStream({
        status: 'active',
        health: { streamId: 'ls-1', status: 'active', health: 'degraded', checkedAt: 'now' },
      }),
    ]);

    // Assert
    const health = fixture.debugElement.query(By.css('.health-badge'));
    expect(health.nativeElement.textContent.trim()).toBe('degraded');
    expect(health.classes['health-degraded']).toBe(true);
  });

  it('shows a dash for health when stream is idle', () => {
    // Arrange / Act
    setStreams([makeStream({ status: 'idle' })]);

    // Assert
    expect(fixture.debugElement.query(By.css('.health-badge'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.text-muted')).nativeElement.textContent.trim()).toBe(
      '-',
    );
  });

  it('shows a dash for health when active but health missing', () => {
    // Arrange / Act
    setStreams([makeStream({ status: 'active', health: undefined })]);

    // Assert
    expect(fixture.debugElement.query(By.css('.health-badge'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.text-muted'))).not.toBeNull();
  });

  it('exposes activate/edit/delete actions for idle streams', () => {
    // Arrange / Act
    setStreams([makeStream({ status: 'idle' })]);

    // Assert
    expect(fixture.debugElement.query(By.css('.btn-primary'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-secondary'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-danger'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-warning'))).toBeNull();
  });

  it('exposes activate/edit/delete actions for error streams', () => {
    // Arrange / Act
    setStreams([makeStream({ status: 'error' })]);

    // Assert
    expect(fixture.debugElement.query(By.css('.btn-primary'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-warning'))).toBeNull();
  });

  it('exposes only deactivate action for active streams', () => {
    // Arrange / Act
    setStreams([makeStream({ status: 'active' })]);

    // Assert
    expect(fixture.debugElement.query(By.css('.btn-warning'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-primary'))).toBeNull();
  });

  it('emits the stream on activate click', () => {
    // Arrange
    const stream = makeStream({ status: 'idle' });
    const spy = vi.fn();
    setStreams([stream]);
    fixture.componentInstance.activate.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-primary')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledWith(stream);
  });

  it('emits the stream on edit click', () => {
    // Arrange
    const stream = makeStream({ status: 'idle' });
    const spy = vi.fn();
    setStreams([stream]);
    fixture.componentInstance.edit.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledWith(stream);
  });

  it('emits the stream on delete click', () => {
    // Arrange
    const stream = makeStream({ status: 'idle' });
    const spy = vi.fn();
    setStreams([stream]);
    fixture.componentInstance.delete.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-danger')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledWith(stream);
  });

  it('emits the stream on deactivate click', () => {
    // Arrange
    const stream = makeStream({ status: 'active' });
    const spy = vi.fn();
    setStreams([stream]);
    fixture.componentInstance.deactivate.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-warning')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledWith(stream);
  });
});
