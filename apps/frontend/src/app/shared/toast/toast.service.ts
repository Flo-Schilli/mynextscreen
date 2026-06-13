import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly type: ToastType;
  readonly message: string;
}

/** How long a toast stays visible before auto-dismissing, per type (ms). */
const DEFAULT_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

/**
 * Global, app-wide toast feedback. Any service or component can surface a
 * transient success/error/info message that floats above the UI so the user
 * actually notices it. Toasts auto-dismiss after a per-type duration and can be
 * dismissed manually. The single {@link ToastContainer} mounted at the app root
 * renders the queue.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<readonly Toast[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = this._toasts.asReadonly();

  success(message: string, durationMs?: number): number {
    return this.show('success', message, durationMs);
  }

  error(message: string, durationMs?: number): number {
    return this.show('error', message, durationMs);
  }

  info(message: string, durationMs?: number): number {
    return this.show('info', message, durationMs);
  }

  show(type: ToastType, message: string, durationMs = DEFAULT_DURATION_MS[type]): number {
    const id = this.nextId++;
    this._toasts.update((current) => [...current, { id, type, message }]);

    if (durationMs > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), durationMs),
      );
    }
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this._toasts.set([]);
  }
}
