import { TranslocoGlobalConfig } from '@jsverse/transloco-utils';

/**
 * Config for transloco-keys-manager (extract / find-missing CI gate).
 * Keeps de.json and en.json free of drift.
 */
const config: TranslocoGlobalConfig = {
  rootTranslationsPath: 'apps/frontend/src/assets/i18n/',
  langs: ['de', 'en'],
  keysManager: {
    input: ['apps/frontend/src'],
    sort: true,
    addMissingKeys: true,
    defaultValue: '',
  },
};

export default config;
