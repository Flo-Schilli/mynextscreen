import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { SelectionService } from './selection.service';
import { SelectionCheckboxComponent } from './selection-checkbox';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

@Component({
  standalone: true,
  imports: [SelectionCheckboxComponent],
  template: `
    @for (id of ids; track id; let i = $index) {
      <app-selection-checkbox [itemId]="id" [itemIndex]="i" [orderedIds]="ids" />
    }
  `,
  providers: [SelectionService],
})
class TestHostComponent {
  ids = ['a', 'b', 'c', 'd', 'e'];
}

describe('SelectionCheckboxComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let service: SelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    service = fixture.debugElement.injector.get(SelectionService);
    fixture.detectChanges();
  });

  function getCheckboxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));
  }

  it('should render a checkbox for each item', () => {
    expect(getCheckboxes().length).toBe(5);
  });

  it('should reflect unselected state initially', () => {
    const checkboxes = getCheckboxes();
    for (const cb of checkboxes) {
      expect(cb.checked).toBe(false);
    }
  });

  it('should toggle selection on click', () => {
    const checkboxes = getCheckboxes();
    checkboxes[0].click();
    fixture.detectChanges();
    expect(service.isSelected('a')()).toBe(true);
    expect(checkboxes[0].checked).toBe(true);
  });

  it('should deselect on second click', () => {
    const checkboxes = getCheckboxes();
    checkboxes[0].click();
    fixture.detectChanges();
    checkboxes[0].click();
    fixture.detectChanges();
    expect(service.isSelected('a')()).toBe(false);
    expect(checkboxes[0].checked).toBe(false);
  });

  it('should select range on shift-click', () => {
    const checkboxes = getCheckboxes();

    // First click sets lastClickedId
    checkboxes[1].click();
    fixture.detectChanges();
    expect(service.isSelected('b')()).toBe(true);

    // Shift-click to select range b..d
    const shiftClick = new MouseEvent('click', {
      bubbles: true,
      shiftKey: true,
    });
    checkboxes[3].dispatchEvent(shiftClick);
    fixture.detectChanges();

    expect(service.isSelected('b')()).toBe(true);
    expect(service.isSelected('c')()).toBe(true);
    expect(service.isSelected('d')()).toBe(true);
    expect(service.isSelected('a')()).toBe(false);
    expect(service.isSelected('e')()).toBe(false);
  });

  it('should have aria-label on each checkbox', () => {
    const checkboxes = getCheckboxes();
    expect(checkboxes[0].getAttribute('aria-label')).toBe('Select item a');
    expect(checkboxes[2].getAttribute('aria-label')).toBe('Select item c');
  });
});
