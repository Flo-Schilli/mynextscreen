import { TestBed, getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SelectionService } from './selection.service';

try {
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
} catch {
  // already initialized
}

describe('SelectionService', () => {
  let service: SelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), SelectionService],
    });
    service = TestBed.inject(SelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty selection', () => {
    expect(service.selectedIds().size).toBe(0);
    expect(service.count()).toBe(0);
    expect(service.hasSelection()).toBe(false);
  });

  describe('toggle', () => {
    it('should add an item when not selected', () => {
      service.toggle('a');
      expect(service.selectedIds().has('a')).toBe(true);
      expect(service.count()).toBe(1);
      expect(service.hasSelection()).toBe(true);
    });

    it('should remove an item when already selected', () => {
      service.toggle('a');
      service.toggle('a');
      expect(service.selectedIds().has('a')).toBe(false);
      expect(service.count()).toBe(0);
    });

    it('should handle multiple items independently', () => {
      service.toggle('a');
      service.toggle('b');
      expect(service.count()).toBe(2);

      service.toggle('a');
      expect(service.selectedIds().has('a')).toBe(false);
      expect(service.selectedIds().has('b')).toBe(true);
      expect(service.count()).toBe(1);
    });
  });

  describe('selectRange', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];

    it('should select all items between fromId and toId inclusive', () => {
      service.selectRange(ids, 'b', 'd');
      expect(service.selectedIds()).toEqual(new Set(['b', 'c', 'd']));
    });

    it('should work regardless of from/to order', () => {
      service.selectRange(ids, 'd', 'b');
      expect(service.selectedIds()).toEqual(new Set(['b', 'c', 'd']));
    });

    it('should preserve existing selections', () => {
      service.toggle('a');
      service.selectRange(ids, 'c', 'e');
      expect(service.selectedIds()).toEqual(new Set(['a', 'c', 'd', 'e']));
    });

    it('should handle single-item range', () => {
      service.selectRange(ids, 'c', 'c');
      expect(service.selectedIds()).toEqual(new Set(['c']));
    });

    it('should be a no-op if fromId is not in the list', () => {
      service.selectRange(ids, 'z', 'c');
      expect(service.count()).toBe(0);
    });

    it('should be a no-op if toId is not in the list', () => {
      service.selectRange(ids, 'a', 'z');
      expect(service.count()).toBe(0);
    });
  });

  describe('selectAll', () => {
    it('should select all provided items', () => {
      service.selectAll(['a', 'b', 'c']);
      expect(service.selectedIds()).toEqual(new Set(['a', 'b', 'c']));
      expect(service.count()).toBe(3);
    });

    it('should replace existing selection', () => {
      service.toggle('x');
      service.selectAll(['a', 'b']);
      expect(service.selectedIds()).toEqual(new Set(['a', 'b']));
    });
  });

  describe('clearAll', () => {
    it('should clear all selections', () => {
      service.toggle('a');
      service.toggle('b');
      service.clearAll();
      expect(service.count()).toBe(0);
      expect(service.hasSelection()).toBe(false);
    });
  });

  describe('isSelected', () => {
    it('should return a signal that reflects selection state', () => {
      const selected = service.isSelected('a');
      expect(selected()).toBe(false);

      service.toggle('a');
      expect(selected()).toBe(true);

      service.toggle('a');
      expect(selected()).toBe(false);
    });

    it('should work for different items independently', () => {
      const selectedA = service.isSelected('a');
      const selectedB = service.isSelected('b');

      service.toggle('a');
      expect(selectedA()).toBe(true);
      expect(selectedB()).toBe(false);
    });
  });

  describe('count', () => {
    it('should reflect the number of selected items', () => {
      expect(service.count()).toBe(0);

      service.toggle('a');
      expect(service.count()).toBe(1);

      service.toggle('b');
      expect(service.count()).toBe(2);

      service.toggle('a');
      expect(service.count()).toBe(1);

      service.clearAll();
      expect(service.count()).toBe(0);
    });
  });
});
