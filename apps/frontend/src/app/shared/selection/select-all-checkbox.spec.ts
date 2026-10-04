import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { SelectionService } from './selection.service';
import { SelectAllCheckboxComponent } from './select-all-checkbox';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

@Component({
  standalone: true,
  imports: [SelectAllCheckboxComponent],
  template: `<app-select-all-checkbox [allIds]="ids" />`,
  providers: [SelectionService],
})
class TestHostComponent {
  ids = ['a', 'b', 'c'];
}

describe('SelectAllCheckboxComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let service: SelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    service = fixture.debugElement.injector.get(SelectionService);
    fixture.detectChanges();
  });

  function getCheckbox(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="checkbox"]');
  }

  it('should render unchecked when nothing is selected', () => {
    const cb = getCheckbox();
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(false);
  });

  it('should select all items on click', () => {
    getCheckbox().click();
    fixture.detectChanges();
    expect(service.selectedIds()).toEqual(new Set(['a', 'b', 'c']));
    expect(getCheckbox().checked).toBe(true);
  });

  it('should clear all items on click when all are selected', () => {
    service.selectAll(['a', 'b', 'c']);
    fixture.detectChanges();
    getCheckbox().click();
    fixture.detectChanges();
    expect(service.count()).toBe(0);
    expect(getCheckbox().checked).toBe(false);
  });

  it('should show indeterminate state when some items are selected', () => {
    service.toggle('a');
    fixture.detectChanges();
    const cb = getCheckbox();
    expect(cb.indeterminate).toBe(true);
    expect(cb.checked).toBe(false);
  });

  it('should select all when clicked in indeterminate state', () => {
    service.toggle('a');
    fixture.detectChanges();
    getCheckbox().click();
    fixture.detectChanges();
    expect(service.selectedIds()).toEqual(new Set(['a', 'b', 'c']));
  });

  it('should have an aria-label', () => {
    expect(getCheckbox().getAttribute('aria-label')).toBe('Select all items');
  });
});
