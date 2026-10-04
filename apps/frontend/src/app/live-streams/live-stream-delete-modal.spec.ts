import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamDeleteModal } from './live-stream-delete-modal';
import { LiveStream } from './live-stream.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

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

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const match = fixture.debugElement
    .queryAll(By.css('button'))
    .find((b) => (b.nativeElement.textContent as string).trim().includes(text));
  if (!match) throw new Error(`No button matching "${text}"`);
  return match.nativeElement as HTMLButtonElement;
}

describe('LiveStreamDeleteModal', () => {
  let fixture: ComponentFixture<LiveStreamDeleteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LiveStreamDeleteModal,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
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
    configure();
    expect(fixture.debugElement.query(By.css('strong')).nativeElement.textContent).toBe(
      'Lobby Cam',
    );
  });

  it('shows the error paragraph only when error is set', () => {
    configure(false, '');
    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();

    fixture.componentRef.setInput('error', 'Cannot delete an active stream.');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Cannot delete an active stream.',
    );
  });

  it('labels the confirm button "Delete" when idle and "Deleting…" when deleting', () => {
    configure(false);
    expect(buttonByText(fixture, 'Delete').disabled).toBe(false);

    fixture.componentRef.setInput('deleting', true);
    fixture.detectChanges();
    const button = buttonByText(fixture, 'Deleting');
    expect(button.disabled).toBe(true);
  });

  it('emits confirm when the delete button is clicked', () => {
    configure();
    const spy = vi.fn();
    fixture.componentInstance.confirm.subscribe(spy);

    buttonByText(fixture, 'Delete').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the cancel button is clicked', () => {
    configure();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    buttonByText(fixture, 'Cancel').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
