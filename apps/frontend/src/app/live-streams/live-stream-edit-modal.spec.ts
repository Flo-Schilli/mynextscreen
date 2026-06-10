import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamEditModal } from './live-stream-edit-modal';
import { LiveStream, UpdateLiveStreamRequest } from './live-stream.model';

async function flush(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await f.whenStable();
  f.detectChanges();
}

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

describe('LiveStreamEditModal', () => {
  let fixture: ComponentFixture<LiveStreamEditModal>;
  let component: LiveStreamEditModal;

  function setup(stream: LiveStream): void {
    fixture = TestBed.createComponent(LiveStreamEditModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('stream', stream);
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStreamEditModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('seeds the form fields from the stream input on init', async () => {
    // Arrange / Act
    setup(
      makeStream({
        name: 'Stage A',
        sourceUrl: 'rtp://a/live',
        protocol: 'rtp',
        transcodingPreset: 'low_480p',
        audioEnabled: false,
      }),
    );
    await flush(fixture);

    // Assert
    const name = fixture.debugElement.query(By.css('#editName')).nativeElement;
    const url = fixture.debugElement.query(By.css('#editSourceUrl')).nativeElement;
    expect(name.value).toBe('Stage A');
    expect(url.value).toBe('rtp://a/live');
  });

  it('emits the seeded values unchanged when submitted as-is', () => {
    // Arrange
    setup(makeStream({ name: 'Stage A', sourceUrl: 'rtp://a', protocol: 'rtp' }));
    let emitted: UpdateLiveStreamRequest | undefined;
    component.save.subscribe((dto) => (emitted = dto));

    // Act
    component.onSubmit();

    // Assert
    expect(emitted).toEqual({
      name: 'Stage A',
      sourceUrl: 'rtp://a',
      protocol: 'rtp',
      transcodingPreset: 'high_1080p',
      audioEnabled: true,
    });
  });

  it('blocks submit and shows local error when name is cleared', async () => {
    // Arrange
    setup(makeStream());
    await flush(fixture);
    const spy = vi.fn();
    component.save.subscribe(spy);
    const name = fixture.debugElement.query(By.css('#editName')).nativeElement;
    name.value = '';
    name.dispatchEvent(new Event('input'));
    await flush(fixture);

    // Act
    component.onSubmit();
    fixture.detectChanges();

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Name is required.',
    );
  });

  it('blocks submit and shows local error when source url is cleared', async () => {
    // Arrange
    setup(makeStream());
    await flush(fixture);
    const spy = vi.fn();
    component.save.subscribe(spy);
    const url = fixture.debugElement.query(By.css('#editSourceUrl')).nativeElement;
    url.value = '';
    url.dispatchEvent(new Event('input'));
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

  it('shows the parent error when no local error is present', () => {
    // Arrange / Act
    setup(makeStream());
    fixture.componentRef.setInput('error', 'Update failed.');
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Update failed.',
    );
  });

  it('disables the save button and shows "Saving..." while saving', () => {
    // Arrange / Act
    setup(makeStream());
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();

    // Assert
    const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submit.nativeElement.disabled).toBe(true);
    expect(submit.nativeElement.textContent.trim()).toBe('Saving...');
  });

  it('emits dismiss when cancel is clicked', () => {
    // Arrange
    setup(makeStream());
    const spy = vi.fn();
    component.dismiss.subscribe(spy);

    // Act
    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
