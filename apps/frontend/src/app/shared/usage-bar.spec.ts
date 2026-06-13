import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UsageBar } from './usage-bar';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('UsageBar', () => {
  let fixture: ComponentFixture<UsageBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageBar],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(UsageBar);
  });

  function set(used: number, total: number): void {
    fixture.componentRef.setInput('label', 'Originals');
    fixture.componentRef.setInput('usedBytes', used);
    fixture.componentRef.setInput('totalBytes', total);
    fixture.detectChanges();
  }

  describe('percent', () => {
    it('returns 0 when the total is zero', () => {
      set(500, 0);
      expect(fixture.componentInstance.percent()).toBe(0);
    });

    it('computes the ratio as a percentage', () => {
      set(250, 1000);
      expect(fixture.componentInstance.percent()).toBe(25);
    });

    it('clamps to 100 when usage exceeds the total', () => {
      set(2000, 1000);
      expect(fixture.componentInstance.percent()).toBe(100);
    });
  });

  describe('threshold classes', () => {
    function barClasses(): DOMTokenList {
      return (fixture.debugElement.query(By.css('.usage-bar')).nativeElement as HTMLElement)
        .classList;
    }

    it('applies neither warning nor danger at or below 80%', () => {
      set(80, 100);
      expect(barClasses().contains('warning')).toBe(false);
      expect(barClasses().contains('danger')).toBe(false);
    });

    it('applies warning between 80% and 95%', () => {
      set(90, 100);
      expect(barClasses().contains('warning')).toBe(true);
      expect(barClasses().contains('danger')).toBe(false);
    });

    it('applies danger above 95%', () => {
      set(99, 100);
      expect(barClasses().contains('danger')).toBe(true);
      expect(barClasses().contains('warning')).toBe(false);
    });
  });

  it('renders the label, used/total value and percent caption', () => {
    set(300, 1000);
    const label = fixture.debugElement.query(By.css('.usage-label')).nativeElement as HTMLElement;
    const value = fixture.debugElement.query(By.css('.usage-value')).nativeElement as HTMLElement;
    const percent = fixture.debugElement.query(By.css('.usage-percent'))
      .nativeElement as HTMLElement;
    expect(label.textContent?.trim()).toBe('Originals');
    expect(value.textContent?.replace(/\s+/g, ' ').trim()).toBe('300 B / 1000 B');
    expect(percent.textContent?.trim()).toBe('30.0%');
  });

  it('binds the variant class to the fill', () => {
    fixture.componentRef.setInput('label', 'Transcoded');
    fixture.componentRef.setInput('usedBytes', 1);
    fixture.componentRef.setInput('totalBytes', 10);
    fixture.componentRef.setInput('variant', 'purple');
    fixture.detectChanges();
    const fill = fixture.debugElement.query(By.css('.usage-fill')).nativeElement as HTMLElement;
    expect(fill.classList.contains('purple')).toBe(true);
  });
});
