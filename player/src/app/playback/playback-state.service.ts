import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlaybackStateService {
  private readonly _currentIndex = signal(0);
  private readonly _totalItems = signal(0);

  readonly currentIndex = this._currentIndex.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();

  setCurrentIndex(index: number): void {
    this._currentIndex.set(index);
  }

  setTotalItems(count: number): void {
    this._totalItems.set(count);
  }

  reset(): void {
    this._currentIndex.set(0);
    this._totalItems.set(0);
  }
}
