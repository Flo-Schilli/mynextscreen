import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamDeleteModal } from './live-stream-delete-modal';
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

describe('LiveStreamDeleteModal', () => {
  let fixture: ComponentFixture<LiveStreamDeleteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStreamDeleteModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamDeleteModal);
  });

  function configure(deleting = false, error = ''): void {
    fixture.componentRef.setInput('stream', makeStream({ name: 'Lobby Cam' }));
    fixture.componentRef.setInput('deleting', deleting);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  it('renders the stream name in the confirmation copy', () => {
    // Arrange / Act
    configure();

    // Assert
    expect(fixture.debugElement.query(By.css('strong')).nativeElement.textContent).toBe(
      'Lobby Cam',
    );
  });

  it('shows the error paragraph only when error is set', () => {
    // Arrange / Act
    configure(false, '');

    // Assert
    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();

    // Act
    fixture.componentRef.setInput('error', 'Cannot delete an active stream.');
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Cannot delete an active stream.',
    );
  });

  it('labels the confirm button "Delete" when idle and "Deleting..." when deleting', () => {
    // Arrange / Act
    configure(false);

    // Assert
    const button = fixture.debugElement.query(By.css('.btn-danger'));
    expect(button.nativeElement.textContent.trim()).toBe('Delete');
    expect(button.nativeElement.disabled).toBe(false);

    // Act
    fixture.componentRef.setInput('deleting', true);
    fixture.detectChanges();

    // Assert
    expect(button.nativeElement.textContent.trim()).toBe('Deleting...');
    expect(button.nativeElement.disabled).toBe(true);
  });

  it('emits confirm when the delete button is clicked', () => {
    // Arrange
    configure();
    const spy = vi.fn();
    fixture.componentInstance.confirm.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-danger')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the cancel button is clicked', () => {
    // Arrange
    configure();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when clicking the overlay backdrop', () => {
    // Arrange
    configure();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalled();
  });
});
