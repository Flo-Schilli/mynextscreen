import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SelectionService } from './selection.service';

@Component({
  selector: 'app-select-all-checkbox',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <input
      *transloco="let t"
      type="checkbox"
      class="selection-checkbox"
      [checked]="allSelected()"
      [indeterminate]="indeterminate()"
      [attr.aria-label]="t('ui.selection.selectAll')"
      (click)="onClick($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .selection-checkbox {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
      accent-color: var(--accent);
      border-radius: 0.25rem;
    }

    .selection-checkbox:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  `,
})
export class SelectAllCheckboxComponent {
  readonly allIds = input.required<string[]>();

  private readonly selectionService = inject(SelectionService);

  readonly allSelected = computed(() => {
    const ids = this.allIds();
    if (ids.length === 0) return false;
    const selected = this.selectionService.selectedIds();
    return ids.every((id) => selected.has(id));
  });

  readonly indeterminate = computed(() => {
    const ids = this.allIds();
    if (ids.length === 0) return false;
    const selected = this.selectionService.selectedIds();
    const count = ids.filter((id) => selected.has(id)).length;
    return count > 0 && count < ids.length;
  });

  onClick(event: MouseEvent): void {
    event.preventDefault();

    if (this.allSelected()) {
      this.selectionService.clearAll();
    } else {
      this.selectionService.selectAll(this.allIds());
    }
  }
}
