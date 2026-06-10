import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamCreateModal } from './live-stream-create-modal';
import { CreateLiveStreamRequest } from './live-stream.model';

async function flush(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await f.whenStable();
  f.detectChanges();
}

describe('LiveStreamCreateModal', () => {
  let fixture: ComponentFixture<LiveStreamCreateModal>;
  let component: LiveStreamCreateModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStreamCreateModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamCreateModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('creating', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
  });

  it('renders one option per transcoding preset', () => {
    // Assert
    const options = fixture.debugElement.queryAll(By.css('#createPreset option'));
    expect(options.length).toBe(5);
    expect(options[4].nativeElement.textContent.trim()).toBe('Passthrough (no re-encode)');
  });

  it('blocks submit and shows a local error when name is empty', () => {
    // Arrange
    const spy = vi.fn();
    component.create.subscribe(spy);

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Name is required.',
    );
  });

  it('blocks submit and shows a local error when source url is empty', async () => {
    // Arrange
    const spy = vi.fn();
    component.create.subscribe(spy);
    const nameInput = fixture.debugElement.query(By.css('#createName')).nativeElement;
    nameInput.value = 'Lobby Cam';
    nameInput.dispatchEvent(new Event('input'));
    await flush(fixture);

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Source URL is required.',
    );
  });

  it('emits a resolved CreateLiveStreamRequest when all required fields are set', async () => {
    // Arrange
    let emitted: CreateLiveStreamRequest | undefined;
    component.create.subscribe((dto) => (emitted = dto));
    const nameInput = fixture.debugElement.query(By.css('#createName')).nativeElement;
    const urlInput = fixture.debugElement.query(By.css('#createSourceUrl')).nativeElement;
    nameInput.value = 'Lobby Cam';
    nameInput.dispatchEvent(new Event('input'));
    urlInput.value = 'rtmp://x/live';
    urlInput.dispatchEvent(new Event('input'));
    await flush(fixture);

    // Act
    component.onSubmit();

    // Assert
    expect(emitted).toEqual({
      name: 'Lobby Cam',
      sourceUrl: 'rtmp://x/live',
      protocol: 'rtmp',
      transcodingPreset: 'high_1080p',
      audioEnabled: true,
    });
  });

  it('clears the local error on a successful submit', async () => {
    // Arrange
    component.onSubmit(); // sets local error
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.error'))).not.toBeNull();

    const nameInput = fixture.debugElement.query(By.css('#createName')).nativeElement;
    const urlInput = fixture.debugElement.query(By.css('#createSourceUrl')).nativeElement;
    nameInput.value = 'Cam';
    nameInput.dispatchEvent(new Event('input'));
    urlInput.value = 'rtmp://x';
    urlInput.dispatchEvent(new Event('input'));
    await flush(fixture);

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();
  });

  it('renders the parent error input when local error is absent', () => {
    // Act
    fixture.componentRef.setInput('error', 'Server rejected the stream.');
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Server rejected the stream.',
    );
  });

  it('disables the submit button and shows "Creating..." while creating', () => {
    // Act
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();

    // Assert
    const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submit.nativeElement.disabled).toBe(true);
    expect(submit.nativeElement.textContent.trim()).toBe('Creating...');
  });

  it('emits dismiss when cancel is clicked', () => {
    // Arrange
    const spy = vi.fn();
    component.dismiss.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay backdrop is clicked', () => {
    // Arrange
    const spy = vi.fn();
    component.dismiss.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalled();
  });
});
