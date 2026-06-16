import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupMonitorFrame, MonitorContent } from './screen-group-monitor-frame';

const CONTENT: MonitorContent = { bg: 'linear-gradient(#000,#111)', label: 'LOBBY', type: 'image' };

describe('ScreenGroupMonitorFrame', () => {
  let fixture: ComponentFixture<ScreenGroupMonitorFrame>;
  let component: ScreenGroupMonitorFrame;

  async function setUp(inputs: Record<string, unknown> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupMonitorFrame],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupMonitorFrame);
    component = fixture.componentInstance;
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('renders the empty state when empty', async () => {
    await setUp({ empty: true });
    expect(fixture.nativeElement.textContent).toContain('Empty');
  });

  it('renders the content label when not empty', async () => {
    await setUp({ content: CONTENT });
    expect(fixture.nativeElement.textContent).toContain('LOBBY');
  });

  it('shows a screen label with the bottom pill', async () => {
    await setUp({ content: CONTENT, label: 'Screen One' });
    expect(fixture.nativeElement.textContent).toContain('Screen One');
  });

  it('produces no slice style without a slice', async () => {
    await setUp({ content: CONTENT });
    expect(component.sliceStyle()).toEqual({});
  });

  it('produces a slice style scaled to the wall geometry', async () => {
    await setUp({ content: CONTENT, slice: { r: 1, c: 1, rows: 2, cols: 2 } });
    expect(component.sliceStyle()).toEqual({
      width: '200%',
      height: '200%',
      left: '-100%',
      top: '-100%',
      inset: 'auto',
    });
  });

  it('scales the label font by the slice rows', async () => {
    await setUp({ content: CONTENT, slice: { r: 0, c: 0, rows: 2, cols: 2 } });
    expect(component.labelFontSize()).toBe('60cqh');
  });
});
