import { CanDeactivateFn } from '@angular/router';

/** A routed component that may hold freshly issued, not yet saved recovery codes. */
export interface HoldsRecoveryCodes {
  /** True when leaving is safe, or the user confirmed to leave anyway. */
  canDeactivate(): boolean;
}

/**
 * Asks before an in-app navigation drops recovery codes that are not yet
 * confirmed as saved (reload / tab close is covered by the wizard's
 * `beforeunload` handler).
 */
export const unsavedRecoveryCodesGuard: CanDeactivateFn<HoldsRecoveryCodes> = (component) =>
  component.canDeactivate();

/** The browser's confirm dialog with the "codes not saved" warning; true = leave anyway. */
export function confirmDiscardRecoveryCodes(message: string): boolean {
  return window.confirm(message);
}
