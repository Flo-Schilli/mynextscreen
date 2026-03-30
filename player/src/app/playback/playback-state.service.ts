import { Injectable, signal } from '@angular/core';

export type StreamHealth = 'healthy' | 'degraded' | 'stopped';

@Injectable({ providedIn: 'root' })
export class PlaybackStateService {
  private readonly _currentIndex = signal(0);
  private readonly _totalItems = signal(0);
  private readonly _streamHealth = signal<StreamHealth | null>(null);

  readonly currentIndex = this._currentIndex.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly streamHealth = this._streamHealth.asReadonly();

  setCurrentIndex(index: number): void {
    this._currentIndex.set(index);
  }

  setTotalItems(count: number): void {
    this._totalItems.set(count);
  }

  setStreamHealth(health: StreamHealth | null): void {
    this._streamHealth.set(health);
  }

  reset(): void {
    this._currentIndex.set(0);
    this._totalItems.set(0);
    this._streamHealth.set(null);
  }
}
