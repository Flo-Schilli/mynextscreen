import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamCreateModal } from './live-stream-create-modal';
import { CreateLiveStreamRequest } from './live-stream.model';

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

  it('renders one segment per transcoding preset plus the two protocol segments', () => {
    // 2 protocol + 5 preset = 7 segments
    const segs = fixture.debugElement.queryAll(By.css('.seg'));
    expect(segs.length).toBe(7);
    expect(segs.some((s) => s.nativeElement.textContent.trim() === 'RTMP')).toBe(true);
    expect(segs.some((s) => s.nativeElement.textContent.trim() === 'RTP')).toBe(true);
    expect(segs.some((s) => s.nativeElement.textContent.includes('Passthrough'))).toBe(true);
  });

  it('blocks submit and shows a local error when name is empty', () => {
    const spy = vi.fn();
    component.create.subscribe(spy);

    component.onSubmit();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Name is required.',
    );
  });

  it('blocks submit and shows a local error when source url is empty', () => {
    const spy = vi.fn();
    component.create.subscribe(spy);
    fixture.componentInstance['name'].set('Lobby Cam');

    component.onSubmit();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Source URL is required.',
    );
  });

  it('emits a resolved CreateLiveStreamRequest when all required fields are set', () => {
    let emitted: CreateLiveStreamRequest | undefined;
    component.create.subscribe((dto) => (emitted = dto));
    fixture.componentInstance['name'].set('Lobby Cam');
    fixture.componentInstance['sourceUrl'].set('rtmp://x/live');

    component.onSubmit();

    expect(emitted).toEqual({
      name: 'Lobby Cam',
      sourceUrl: 'rtmp://x/live',
      protocol: 'rtmp',
      transcodingPreset: 'high_1080p',
      audioEnabled: true,
    });
  });

  it('emits the selected protocol and preset', () => {
    let emitted: CreateLiveStreamRequest | undefined;
    component.create.subscribe((dto) => (emitted = dto));
    fixture.componentInstance['name'].set('Cam');
    fixture.componentInstance['sourceUrl'].set('rtp://x');
    fixture.componentInstance['protocol'].set('rtp');
    fixture.componentInstance['quality'].set('passthrough');

    component.onSubmit();

    expect(emitted?.protocol).toBe('rtp');
    expect(emitted?.transcodingPreset).toBe('passthrough');
  });

  it('clears the local error on a successful submit', () => {
    component.onSubmit();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.error'))).not.toBeNull();

    fixture.componentInstance['name'].set('Cam');
    fixture.componentInstance['sourceUrl'].set('rtmp://x');
    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.error'))).toBeNull();
  });

  it('renders the parent error input when local error is absent', () => {
    fixture.componentRef.setInput('error', 'Server rejected the stream.');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
      'Server rejected the stream.',
    );
  });

  it('disables the submit button and shows "Creating…" while creating', () => {
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const submit = buttons.find((b) => b.nativeElement.textContent.includes('Creating'));
    expect(submit).toBeTruthy();
    expect(submit!.nativeElement.disabled).toBe(true);
  });

  it('emits dismiss when cancel is clicked', () => {
    const spy = vi.fn();
    component.dismiss.subscribe(spy);

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const cancel = buttons.find((b) => b.nativeElement.textContent.trim() === 'Cancel');
    cancel!.nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
