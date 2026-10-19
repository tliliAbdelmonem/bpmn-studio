import { CanDeactivateFn } from '@angular/router';

/** A routed page that can hold edits not yet saved. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Leave this page and discard them?';

/**
 * Asks before navigating away inside the app. Closing or reloading the tab is covered by the
 * page's `beforeunload` handler, where browsers only allow their own native prompt.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) =>
  !page.hasUnsavedChanges() || window.confirm(UNSAVED_CHANGES_MESSAGE);
