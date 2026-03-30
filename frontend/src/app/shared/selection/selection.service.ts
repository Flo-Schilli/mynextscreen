import { Injectable, computed, signal } from '@angular/core';

@Injectable()
export class SelectionService {
  private readonly _selectedIds = signal<Set<string>>(new Set());

  readonly selectedIds = this._selectedIds.asReadonly();
  readonly count = computed(() => this._selectedIds().size);
  readonly hasSelection = computed(() => this._selectedIds().size > 0);

  toggle(id: string): void {
    this._selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  selectRange(ids: string[], fromId: string, toId: string): void {
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    this._selectedIds.update((current) => {
      const next = new Set(current);
      for (let i = start; i <= end; i++) {
        next.add(ids[i]);
      }
      return next;
    });
  }

  selectAll(ids: string[]): void {
    this._selectedIds.set(new Set(ids));
  }

  clearAll(): void {
    this._selectedIds.set(new Set());
  }

  isSelected(id: string): ReturnType<typeof computed<boolean>> {
    return computed(() => this._selectedIds().has(id));
  }
}
