import { DestroyRef, inject } from '@angular/core';

/** Layers that are open right now, innermost last. */
const openLayers: object[] = [];

/**
 * Puts `token` on top of the layer stack. Call `closeLayer` when it goes away.
 *
 * Escape has to be handled on the document: a dialog that has just opened has
 * nothing focused inside it, so the keypress lands on `<body>` and never
 * reaches a handler bound to the backdrop. Handling it globally would make
 * every open layer answer the same keypress, which would close a dropdown, the
 * confirmation it sits in and the form behind that in one go — hence the stack.
 */
export function openLayer(token: object): void {
  closeLayer(token);
  openLayers.push(token);
}

export function closeLayer(token: object): void {
  const index = openLayers.indexOf(token);
  if (index !== -1) {
    openLayers.splice(index, 1);
  }
}

/** True while nothing else is stacked on top of `token`. */
export function isInnermostLayer(token: object): boolean {
  return openLayers[openLayers.length - 1] === token;
}

/**
 * For a layer that is open for as long as its component lives, such as a
 * dialog rendered behind an `@if`. Returns a predicate saying whether it is
 * currently the innermost one.
 *
 * Must be called from an injection context (a field initialiser or a
 * constructor), because it hooks the component's own destruction.
 */
export function useDialogStack(): () => boolean {
  const token = {};
  openLayer(token);
  inject(DestroyRef).onDestroy(() => closeLayer(token));
  return () => isInnermostLayer(token);
}
