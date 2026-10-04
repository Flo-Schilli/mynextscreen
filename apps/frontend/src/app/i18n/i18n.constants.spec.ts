import { isAppLang, resolveInitialLang, DEFAULT_LANG } from './i18n.constants';

describe('i18n constants', () => {
  describe('isAppLang', () => {
    it('accepts supported languages', () => {
      expect(isAppLang('de')).toBe(true);
      expect(isAppLang('en')).toBe(true);
    });

    it('rejects anything else', () => {
      expect(isAppLang('fr')).toBe(false);
      expect(isAppLang('')).toBe(false);
      expect(isAppLang(null)).toBe(false);
      expect(isAppLang(undefined)).toBe(false);
    });
  });

  describe('resolveInitialLang', () => {
    it('prefers a valid stored choice over the browser language', () => {
      expect(resolveInitialLang('en', 'de-DE')).toBe('en');
    });

    it('falls back to the browser language prefix when nothing is stored', () => {
      expect(resolveInitialLang(null, 'en-GB')).toBe('en');
      expect(resolveInitialLang(null, 'de')).toBe('de');
    });

    it('is case-insensitive on the browser language prefix', () => {
      expect(resolveInitialLang(null, 'EN-us')).toBe('en');
    });

    it('falls back to the default when neither source resolves', () => {
      expect(resolveInitialLang(null, 'fr-FR')).toBe(DEFAULT_LANG);
      expect(resolveInitialLang('xx', null)).toBe(DEFAULT_LANG);
      expect(resolveInitialLang(null, undefined)).toBe(DEFAULT_LANG);
    });
  });
});
