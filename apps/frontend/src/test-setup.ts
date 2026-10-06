/**
 * Runs before every spec file.
 *
 * Specs persist the UI language (and theme) to `localStorage`, and on CI that
 * storage outlives a single spec file. A later spec whose service builds
 * `LanguageService` then starts in whatever language the previous file left
 * behind, so it passes or fails depending on file order. Clearing before each
 * test makes every spec start from the same state it sees locally.
 */
beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // Storage can be unavailable; then nothing can leak through it either.
  }
});
