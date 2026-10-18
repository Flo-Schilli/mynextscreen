import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PtzControlPanel, PTZ_HEARTBEAT_MS } from './ptz-control-panel';
import { PtzCommand } from './live-stream.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

describe('PtzControlPanel', () => {
  let fixture: ComponentFixture<PtzControlPanel>;
  let emitted: PtzCommand[];

  const button = (label: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);
  const fire = (el: Element, type: string, init: object = {}): void => {
    el.dispatchEvent(new Event(type, { bubbles: true, ...init }));
    fixture.detectChanges();
  };
  const key = (type: 'keydown' | 'keyup', k: string, target?: Element): void => {
    const el = target ?? fixture.nativeElement.querySelector('.pad-btn');
    el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PtzControlPanel,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PtzControlPanel);
    emitted = [];
    fixture.componentInstance.ptzCommand.subscribe((c) => emitted.push(c));
    fixture.detectChanges();
  });

  it('emits nothing on creation', () => {
    expect(emitted).toEqual([]);
  });

  it('emits move on pointerdown and stop on pointerup', () => {
    const up = button('Tilt up');
    fire(up, 'pointerdown');
    fire(up, 'pointerup');
    expect(emitted).toEqual([{ action: 'move', direction: 'up', speed: 5 }, { action: 'stop' }]);
  });

  it.each(['pointerleave', 'pointercancel'])('emits stop on %s', (type) => {
    const left = button('Pan left');
    fire(left, 'pointerdown');
    fire(left, type);
    expect(emitted.at(-1)).toEqual({ action: 'stop' });
  });

  it('does not emit stop for a pointerleave without a prior press', () => {
    fire(button('Pan left'), 'pointerleave');
    expect(emitted).toEqual([]);
  });

  it('does not repeat move for the same direction', () => {
    const right = button('Pan right');
    fire(right, 'pointerdown');
    fire(right, 'pointerdown');
    expect(emitted.filter((c) => c.action === 'move')).toHaveLength(1);
  });

  it('uses the current speed from the slider', () => {
    const slider = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;
    slider.value = '9';
    fire(slider, 'input');
    fire(button('Up right'), 'pointerdown');
    expect(emitted[0]).toEqual({ action: 'move', direction: 'up_right', speed: 9 });
  });

  it('emits the explicit stop button as a single stop', () => {
    fire(button('Tilt down'), 'pointerdown');
    emitted.length = 0;
    button('Stop').click();
    expect(emitted).toEqual([{ action: 'stop' }]);
  });

  it('emits zoom on hold and stop on release', () => {
    const zoomIn = button('Zoom in');
    fire(zoomIn, 'pointerdown');
    fire(zoomIn, 'pointerup');
    const zoomOut = button('Zoom out');
    fire(zoomOut, 'pointerdown');
    fire(zoomOut, 'pointerup');
    expect(emitted).toEqual([
      { action: 'zoom', direction: 'in', speed: 4 },
      { action: 'stop' },
      { action: 'zoom', direction: 'out', speed: 4 },
      { action: 'stop' },
    ]);
  });

  it('emits home', () => {
    (fixture.nativeElement.querySelector('.home') as HTMLButtonElement).click();
    expect(emitted).toEqual([{ action: 'home' }]);
  });

  describe('keyboard', () => {
    it('moves once per direction change and stops on keyup', () => {
      key('keydown', 'ArrowUp');
      key('keydown', 'ArrowUp');
      key('keydown', 'ArrowUp');
      key('keyup', 'ArrowUp');
      expect(emitted).toEqual([{ action: 'move', direction: 'up', speed: 5 }, { action: 'stop' }]);
    });

    it('combines two arrow keys into a diagonal and falls back on release', () => {
      key('keydown', 'ArrowUp');
      key('keydown', 'ArrowLeft');
      key('keyup', 'ArrowUp');
      key('keyup', 'ArrowLeft');
      expect(emitted.map((c) => (c.action === 'move' ? c.direction : c.action))).toEqual([
        'up',
        'up_left',
        'left',
        'stop',
      ]);
    });

    it('ignores other keys', () => {
      key('keydown', 'a');
      expect(emitted).toEqual([]);
    });

    it('leaves arrow keys to the speed slider', () => {
      key('keydown', 'ArrowRight', fixture.nativeElement.querySelector('input[type="range"]'));
      expect(emitted).toEqual([]);
    });

    it('stops when focus leaves the panel while a key is held', () => {
      key('keydown', 'ArrowDown');
      const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;
      panel.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      expect(emitted.at(-1)).toEqual({ action: 'stop' });
    });
  });

  describe('presets', () => {
    it('recalls the 0-based preset index by default', () => {
      button('Recall preset 3').click();
      expect(emitted).toEqual([{ action: 'preset_recall', preset: 2 }]);
    });

    it('stores in save mode and then returns to recall mode', () => {
      const toggle = fixture.debugElement.queryAll(By.css('.save-toggle'))[0]
        .nativeElement as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();
      button('Store preset 1').click();
      fixture.detectChanges();
      button('Recall preset 1').click();
      expect(emitted).toEqual([
        { action: 'preset_store', preset: 0 },
        { action: 'preset_recall', preset: 0 },
      ]);
    });
  });

  describe('disabled', () => {
    it('disables all controls and ignores input', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(button('Tilt up').disabled).toBe(true);
      fire(button('Tilt up'), 'pointerdown');
      key('keydown', 'ArrowUp');
      expect(emitted).toEqual([]);
    });

    it('releases an active move when it becomes disabled', async () => {
      fire(button('Tilt up'), 'pointerdown');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(emitted.at(-1)).toEqual({ action: 'stop' });
    });
  });

  describe('heartbeat while held', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const moves = (): PtzCommand[] => emitted.filter((c) => c.action === 'move');

    it('emits immediately, then repeats the move every 500 ms until release', () => {
      fire(button('Tilt up'), 'pointerdown');
      expect(moves()).toHaveLength(1);

      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS);
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS);
      expect(moves()).toHaveLength(3);

      fire(button('Tilt up'), 'pointerup');
      expect(emitted.at(-1)).toEqual({ action: 'stop' });
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 4);
      expect(moves()).toHaveLength(3);
    });

    it('repeats the held zoom', () => {
      fire(button('Zoom in'), 'pointerdown');
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS);

      expect(emitted.filter((c) => c.action === 'zoom')).toHaveLength(2);

      fire(button('Zoom in'), 'pointerleave');
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 3);
      expect(emitted.filter((c) => c.action === 'zoom')).toHaveLength(2);
    });

    it('sends a changed direction at once and restarts the interval', () => {
      fire(button('Pan left'), 'pointerdown');
      vi.advanceTimersByTime(300);
      fire(button('Pan right'), 'pointerdown');
      expect(moves().at(-1)).toMatchObject({ direction: 'right' });
      const before = moves().length;

      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS - 1);
      expect(moves()).toHaveLength(before);
      vi.advanceTimersByTime(1);
      expect(moves()).toHaveLength(before + 1);
      expect(moves().at(-1)).toMatchObject({ direction: 'right' });
    });

    it('picks up a speed change on the next beat', () => {
      fire(button('Pan left'), 'pointerdown');
      const slider = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;
      slider.value = '8';
      fire(slider, 'input');

      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS);

      expect(moves().at(-1)).toMatchObject({ speed: 8 });
    });

    it('stops repeating after the explicit stop button', () => {
      fire(button('Tilt down'), 'pointerdown');
      button('Stop').click();
      const count = emitted.length;

      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 4);

      expect(emitted).toHaveLength(count);
    });

    it('stops repeating when keys are released or focus is lost', () => {
      key('keydown', 'ArrowUp');
      key('keyup', 'ArrowUp');
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 2);
      expect(moves()).toHaveLength(1);

      key('keydown', 'ArrowDown');
      const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;
      panel.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 2);
      expect(moves()).toHaveLength(2);
      expect(emitted.at(-1)).toEqual({ action: 'stop' });
    });

    it('stops repeating and emits stop when disabled', () => {
      fire(button('Tilt up'), 'pointerdown');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(emitted.at(-1)).toEqual({ action: 'stop' });
      const count = emitted.length;

      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 4);

      expect(emitted).toHaveLength(count);
    });

    it('emits stop and stops repeating when destroyed while holding', () => {
      fire(button('Tilt up'), 'pointerdown');

      fixture.destroy();

      expect(emitted.at(-1)).toEqual({ action: 'stop' });
      const count = emitted.length;
      vi.advanceTimersByTime(PTZ_HEARTBEAT_MS * 4);
      expect(emitted).toHaveLength(count);
    });

    it('emits nothing on destroy when idle', () => {
      fixture.destroy();

      expect(emitted).toEqual([]);
    });
  });
});
