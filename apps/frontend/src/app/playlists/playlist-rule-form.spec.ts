import { ContentSource, SlideFormat } from '../sources/content-source.model';
import { PlaylistRule } from './playlist.model';
import {
  RuleFormState,
  alignFormat,
  availableFormats,
  defaultRuleForm,
  pruneUnknownSources,
  ruleFormFrom,
  sameRule,
  toRule,
  validateRuleForm,
} from './playlist-rule-form';

const RULE: PlaylistRule = {
  sourceIds: ['s1'],
  genres: { match: 'all', values: ['Metal', 'Punk'] },
  venues: ['Hirsch'],
  dateFrom: { mode: 'relativeDays', days: 2 },
  dateTo: { mode: 'fixed', date: '2027-01-31' },
  excludeCancelled: false,
  excludeSoldOut: true,
  sort: 'date_desc',
  limit: 30,
  graceHours: 2,
  refreshIntervalMinutes: 60,
  format: '1080x1920',
  itemDurationSeconds: 8,
  transition: 'cut',
  transitionDurationMs: 0,
};

function source(id: string, formats: SlideFormat[]): ContentSource {
  return {
    id,
    organisationId: 'org1',
    name: id,
    adapterType: 'x',
    params: {},
    formats,
    style: { background: 'black', accentColor: '#e30613' },
    syncIntervalMinutes: 360,
    enabled: true,
    nextSyncAt: null,
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    lastSyncSummary: null,
    createdAt: '',
    updatedAt: '',
  };
}

function validForm(overrides: Partial<RuleFormState> = {}): RuleFormState {
  return { ...defaultRuleForm(), sourceIds: ['s1'], format: '1920x1080', ...overrides };
}

describe('playlist rule form', () => {
  it('round-trips a stored rule', () => {
    expect(toRule(ruleFormFrom(RULE))).toEqual(RULE);
  });

  it('starts with the backend defaults', () => {
    expect(toRule(validForm())).toEqual({
      sourceIds: ['s1'],
      genres: { match: 'any', values: [] },
      venues: [],
      dateFrom: { mode: 'today' },
      dateTo: { mode: 'none' },
      excludeCancelled: true,
      excludeSoldOut: false,
      sort: 'date_asc',
      limit: 50,
      graceHours: 4,
      refreshIntervalMinutes: 15,
      format: '1920x1080',
      itemDurationSeconds: 10,
      transition: 'fade',
      transitionDurationMs: 500,
    });
  });

  it('keeps only the active date mode in the rule but remembers the others while editing', () => {
    const form = validForm({ dateFromMode: 'fixed', dateFromDate: '2026-11-01', dateFromDays: 7 });
    expect(toRule(form)?.dateFrom).toEqual({ mode: 'fixed', date: '2026-11-01' });

    const back = { ...form, dateFromMode: 'relativeDays' as const };
    expect(toRule(back)?.dateFrom).toEqual({ mode: 'relativeDays', days: 7 });
    expect(back.dateFromDate).toBe('2026-11-01');
  });

  it('needs sources and a format', () => {
    expect(validateRuleForm(defaultRuleForm())).toEqual(['sourcesRequired', 'formatRequired']);
    expect(toRule(defaultRuleForm())).toBeNull();
  });

  it('caps the number of sources', () => {
    const sourceIds = Array.from({ length: 21 }, (_, i) => `s${i}`);
    expect(validateRuleForm(validForm({ sourceIds }))).toEqual(['tooManySources']);
  });

  it('rejects incomplete or inverted date bounds', () => {
    expect(validateRuleForm(validForm({ dateFromMode: 'fixed', dateFromDate: '' }))).toEqual([
      'dateFromInvalid',
    ]);
    expect(validateRuleForm(validForm({ dateToMode: 'relativeDays', dateToDays: 731 }))).toEqual([
      'dateToInvalid',
    ]);
    expect(
      validateRuleForm(
        validForm({
          dateFromMode: 'fixed',
          dateFromDate: '2027-02-01',
          dateToMode: 'fixed',
          dateToDate: '2027-01-31',
        }),
      ),
    ).toEqual(['dateRangeInvalid']);
  });

  it('rejects numbers outside the backend bounds', () => {
    for (const change of [
      { limit: 0 },
      { limit: 201 },
      { graceHours: 25 },
      { refreshIntervalMinutes: 4 },
      { itemDurationSeconds: 0 },
      { transitionDurationMs: 3001 },
      { limit: 2.5 },
    ]) {
      expect(validateRuleForm(validForm(change))).toEqual(['numberOutOfRange']);
    }
  });

  it('compares rules structurally', () => {
    expect(sameRule(RULE, { ...RULE })).toBe(true);
    expect(sameRule(RULE, { ...RULE, limit: 31 })).toBe(false);
    expect(sameRule(null, null)).toBe(true);
  });

  it('prunes sources the organisation no longer has and reports them', () => {
    const form = validForm({ sourceIds: ['s1', 'gone', 's2'] });
    const { form: pruned, removed } = pruneUnknownSources(form, new Set(['s1', 's2']));

    expect(pruned.sourceIds).toEqual(['s1', 's2']);
    expect(removed).toEqual(['gone']);
  });

  it('returns the same form when nothing is unknown', () => {
    const form = validForm();
    expect(pruneUnknownSources(form, new Set(['s1'])).form).toBe(form);
  });

  it('offers the formats the picked sources render, in canonical order', () => {
    const sources = [source('a', ['1080x1920']), source('b', ['3840x2160', '1920x1080'])];

    expect(availableFormats(sources, ['a', 'b'])).toEqual(['1920x1080', '1080x1920', '3840x2160']);
    expect(availableFormats(sources, ['a'])).toEqual(['1080x1920']);
    expect(availableFormats(sources, [])).toEqual([]);
  });

  it('keeps a rendered format and replaces one no picked source renders', () => {
    const form = validForm({ format: '1080x1920' });

    expect(alignFormat(form, ['1920x1080', '1080x1920'])).toBe(form);
    expect(alignFormat(form, ['1920x1080']).format).toBe('1920x1080');
    expect(alignFormat(form, []).format).toBe('');
  });
});
