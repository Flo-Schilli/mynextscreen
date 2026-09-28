/**
 * The locale every date and time in this UI is formatted with.
 *
 * The interface is written in English and not translated. Leaving
 * `toLocaleDateString()` to pick the browser's locale therefore does not
 * localise anything — it only mixes languages: a German browser renders
 * "Montag, 28. September" next to "Schedules" and "New schedule". One locale,
 * applied everywhere, is the honest version until the UI is actually
 * translated.
 */
export const UI_LOCALE = 'en-US';
