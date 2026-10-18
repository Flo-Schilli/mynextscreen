import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LiveStreamCreateModal } from './live-stream-create-modal';
import { CreateLiveStreamRequest } from './live-stream.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

describe('LiveStreamCreateModal', () => {
  let fixture: ComponentFixture<LiveStreamCreateModal>;
  let component: LiveStreamCreateModal;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LiveStreamCreateModal,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveStreamCreateModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('creating', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
  });

  it('renders one segment per transcoding preset plus source type and protocol segments', () => {
    // 2 source type + 2 protocol + 5 preset = 9 segments
    const segs = fixture.debugElement.queryAll(By.css('.seg'));
    expect(segs.length).toBe(9);
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

  describe('NDI source type', () => {
    const inst = (): Record<string, { set: (v: unknown) => void }> =>
      component as unknown as Record<string, { set: (v: unknown) => void }>;
    let emitted: CreateLiveStreamRequest | undefined;

    beforeEach(() => {
      emitted = undefined;
      component.create.subscribe((dto) => (emitted = dto));
      inst()['sourceType'].set('ndi');
      inst()['name'].set('Cam');
      fixture.detectChanges();
    });

    const errorText = (): string =>
      fixture.debugElement.query(By.css('.error')).nativeElement.textContent;

    it('hides pull fields and shows the NDI trademark note with link', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Source URL');
      expect(text).toContain('registered trademark of Vizrt NDI AB');
      expect(fixture.nativeElement.querySelector('a[href="https://ndi.video"]')).not.toBeNull();
    });

    it('requires an agent', () => {
      component.onSubmit();
      fixture.detectChanges();
      expect(emitted).toBeUndefined();
      expect(errorText()).toContain('Site agent is required.');
    });

    it('requires a camera address', () => {
      inst()['agentId'].set('ag-1');
      component.onSubmit();
      fixture.detectChanges();
      expect(errorText()).toContain('Camera IP address is required.');
    });

    it.each(['cam.local', '999.1.1.1', '1.2.3', 'abc::def::1'])('rejects %s', (host) => {
      inst()['agentId'].set('ag-1');
      inst()['cameraHost'].set(host);
      component.onSubmit();
      fixture.detectChanges();
      expect(emitted).toBeUndefined();
      expect(errorText()).toContain('valid IPv4 or IPv6');
    });

    it('emits NDI defaults without pull fields or an empty source name', () => {
      inst()['agentId'].set('ag-1');
      inst()['cameraHost'].set(' 192.168.1.50 ');
      component.onSubmit();
      expect(emitted).toEqual({
        name: 'Cam',
        sourceType: 'ndi',
        agentId: 'ag-1',
        cameraHost: '192.168.1.50',
        qualityPreset: '720p30',
        encoderPref: 'auto',
      });
    });

    it('accepts IPv6 and passes source name, preset and encoder', () => {
      inst()['agentId'].set('ag-1');
      inst()['cameraHost'].set('fe80::1');
      inst()['ndiSourceName'].set('CAM (Main)');
      inst()['qualityPreset'].set('1080p30');
      inst()['encoderPref'].set('hardware');
      component.onSubmit();
      expect(emitted).toMatchObject({
        cameraHost: 'fe80::1',
        ndiSourceName: 'CAM (Main)',
        qualityPreset: '1080p30',
        encoderPref: 'hardware',
      });
    });

    describe('PTZ', () => {
      beforeEach(() => {
        inst()['agentId'].set('ag-1');
        inst()['cameraHost'].set('192.168.1.50');
      });

      it('hides protocol and port until PTZ is enabled', () => {
        expect(fixture.nativeElement.textContent).not.toContain('VISCA UDP');
        inst()['ptzEnabled'].set(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('VISCA UDP');
        expect(fixture.nativeElement.textContent).toContain('VISCA TCP');
      });

      it('shows the protocol default port as placeholder', () => {
        inst()['ptzEnabled'].set(true);
        fixture.detectChanges();
        const input = (): HTMLInputElement =>
          fixture.nativeElement.querySelector('input[type="number"]');
        expect(input().placeholder).toBe('52381');
        inst()['ptzProtocol'].set('visca_tcp');
        fixture.detectChanges();
        expect(input().placeholder).toBe('5678');
      });

      it('emits PTZ fields with a null port when the port is empty', () => {
        inst()['ptzEnabled'].set(true);
        inst()['ptzProtocol'].set('visca_tcp');
        component.onSubmit();
        expect(emitted).toMatchObject({
          ptzEnabled: true,
          ptzProtocol: 'visca_tcp',
          ptzPort: null,
        });
      });

      it('emits a numeric port', () => {
        inst()['ptzEnabled'].set(true);
        inst()['ptzPort'].set('1259');
        component.onSubmit();
        expect(emitted?.ptzPort).toBe(1259);
      });

      it.each(['0', '65536', 'abc', '12.5', '-1'])('rejects port %s', (port) => {
        inst()['ptzEnabled'].set(true);
        inst()['ptzPort'].set(port);
        component.onSubmit();
        fixture.detectChanges();
        expect(emitted).toBeUndefined();
        expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
          'between 1 and 65535',
        );
      });

      it('ignores an invalid port while PTZ is disabled', () => {
        inst()['ptzPort'].set('999999');
        component.onSubmit();
        expect(emitted).toBeDefined();
        expect(emitted).not.toHaveProperty('ptzEnabled');
      });
    });
  });
});
