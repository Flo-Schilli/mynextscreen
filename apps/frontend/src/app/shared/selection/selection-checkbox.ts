import { Component, computed, inject, input } from '@angular/core';
import { SelectionService } from './selection.service';

@Component({
  selector: 'app-selection-checkbox',
  standalone: true,
  template: `
    <input
      type="checkbox"
      class="selection-checkbox"
      [checked]="checked()"
      [attr.aria-label]="'Select item ' + itemId()"
      (click)="onClick($event)"
    />
  `,
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
export class SelectionCheckboxComponent {
  readonly itemId = input.required<string>();
  readonly itemIndex = input.required<number>();
  readonly orderedIds = input.required<string[]>();

  private readonly selectionService = inject(SelectionService);

  readonly checked = computed(() => this.selectionService.selectedIds().has(this.itemId()));

  onClick(event: MouseEvent): void {
    event.preventDefault();

    if (event.shiftKey) {
      const lastId = this.selectionService.lastClickedId();
      if (lastId !== null) {
        this.selectionService.selectRange(this.orderedIds(), lastId, this.itemId());
        return;
      }
    }

    this.selectionService.toggle(this.itemId());
  }
}
