import { DestroyRef, inject } from '@angular/core';

/** Dialogs that are open right now, innermost last. */
const openDialogs: object[] = [];

/**
 * Registers the calling dialog for as long as it lives and returns a predicate
 * saying whether it is currently the innermost open one.
 *
 * Escape has to be handled on the document: a dialog that has just opened has
 * nothing focused inside it, so the keypress lands on `<body>` and never
 * reaches a handler bound to the backdrop. Handling it globally would make
 * every open dialog answer the same keypress, which would close a confirmation
 * and the form behind it in one go — hence the stack.
 *
 * Must be called from an injection context (a field initialiser or a
 * constructor), because it hooks the component's own destruction.
 */
export function useDialogStack(): () => boolean {
  const token = {};
  openDialogs.push(token);

  inject(DestroyRef).onDestroy(() => {
    const index = openDialogs.indexOf(token);
    if (index !== -1) {
      openDialogs.splice(index, 1);
    }
  });

  return () => openDialogs[openDialogs.length - 1] === token;
}
