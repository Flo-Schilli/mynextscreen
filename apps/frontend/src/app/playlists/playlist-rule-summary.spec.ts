import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import { formatIsoDate } from '../i18n/locale-date-input';
import { PlaylistRule } from './playlist.model';
import { summariseRule } from './playlist-rule-summary';

const RULE: PlaylistRule = {
  sourceIds: ['s1'],
  genres: { match: 'any', values: ['Metal'] },
  venues: ['Hirsch', 'Löwensaal', 'Z-Bau'],
  dateFrom: { mode: 'today' },
  dateTo: { mode: 'fixed', date: '2027-01-31' },
  excludeCancelled: true,
  excludeSoldOut: false,
  sort: 'date_asc',
  limit: 30,
  graceHours: 4,
  refreshIntervalMinutes: 15,
  format: '1920x1080',
  itemDurationSeconds: 10,
  transition: 'fade',
  transitionDurationMs: 500,
};

describe('summariseRule', () => {
  let transloco: TranslocoService;

  function summary(rule: PlaylistRule, lang: 'de' | 'en' = 'de'): string {
    transloco.setActiveLang(lang);
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    return summariseRule(rule, {
      translate: (key, params) => transloco.translate(key, params),
      formatDate: (iso) => formatIsoDate(iso, locale),
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
    });
    transloco = TestBed.inject(TranslocoService);
  });

  it('reads like the plan example', () => {
    expect(summary(RULE)).toBe(
      'Metal · Hirsch, Löwensaal, Z-Bau · ab heute bis 31.01.2027 · ohne abgesagte · max. 30',
    );
  });

  it('says "all" for empty genre and venue filters and drops an open end', () => {
    const rule: PlaylistRule = {
      ...RULE,
      genres: { match: 'any', values: [] },
      venues: [],
      dateTo: { mode: 'none' },
      excludeCancelled: false,
      excludeSoldOut: true,
    };

    expect(summary(rule)).toBe(
      'Alle Genres · Alle Spielorte · ab heute · ohne ausverkaufte · max. 30',
    );
  });

  it('joins genres that must all match with an ampersand', () => {
    const rule: PlaylistRule = { ...RULE, genres: { match: 'all', values: ['Metal', 'Punk'] } };

    expect(summary(rule).startsWith('Metal & Punk · ')).toBe(true);
  });

  it('spells out relative day bounds with plurals', () => {
    const rule: PlaylistRule = {
      ...RULE,
      dateFrom: { mode: 'relativeDays', days: 1 },
      dateTo: { mode: 'relativeDays', days: 14 },
    };

    expect(summary(rule)).toContain('ab morgen bis in 14 Tagen');
    expect(summary(rule, 'en')).toContain('from tomorrow until in 14 days');
  });

  it('formats a fixed start date in the active locale', () => {
    const rule: PlaylistRule = {
      ...RULE,
      dateFrom: { mode: 'fixed', date: '2026-11-05' },
      dateTo: { mode: 'none' },
    };

    expect(summary(rule, 'en')).toContain('from 11/05/2026');
  });
});
