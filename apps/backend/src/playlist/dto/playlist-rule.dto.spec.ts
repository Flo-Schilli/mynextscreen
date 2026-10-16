import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TransitionType } from '../transition-type.enum';
import { PlaylistKind } from '../playlist-kind.enum';
import { CreatePlaylistDto } from './create-playlist.dto';
import { PlaylistRuleDto, toPlaylistRule } from './playlist-rule.dto';

const SOURCE_ID = '550e8400-e29b-41d4-a716-446655440000';

function toDto(plain: Record<string, unknown>): PlaylistRuleDto {
  return plainToInstance(PlaylistRuleDto, plain);
}

const minimal = { sourceIds: [SOURCE_ID], format: '1920x1080' };

describe('PlaylistRuleDto', () => {
  it('fills every optional field with its default', async () => {
    const dto = toDto(minimal);

    expect(await validate(dto, { forbidNonWhitelisted: true, whitelist: true })).toHaveLength(0);
    expect(toPlaylistRule(dto)).toEqual({
      sourceIds: [SOURCE_ID],
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
      transition: TransitionType.Fade,
      transitionDurationMs: 500,
    });
  });

  it('accepts a full rule and normalises the date modes', async () => {
    const dto = toDto({
      ...minimal,
      genres: { match: 'all', values: ['Metal', 'Rock'] },
      venues: ['Hirsch', 'Löwensaal'],
      dateFrom: { mode: 'relativeDays', days: 3, date: '2026-01-01' },
      dateTo: { mode: 'fixed', date: '2027-01-31' },
      excludeSoldOut: true,
      sort: 'date_desc',
      limit: 30,
      graceHours: 0,
      refreshIntervalMinutes: 60,
      itemDurationSeconds: 8,
      transition: TransitionType.Cut,
      transitionDurationMs: 0,
    });

    expect(await validate(dto, { forbidNonWhitelisted: true, whitelist: true })).toHaveLength(0);
    const rule = toPlaylistRule(dto);
    expect(rule.dateFrom).toEqual({ mode: 'relativeDays', days: 3 });
    expect(rule.dateTo).toEqual({ mode: 'fixed', date: '2027-01-31' });
    expect(rule.genres).toEqual({ match: 'all', values: ['Metal', 'Rock'] });
  });

  it.each([
    [{ ...minimal, sourceIds: [] }],
    [{ ...minimal, sourceIds: ['nope'] }],
    [{ ...minimal, format: '800x600' }],
    [{ format: '1920x1080' }],
    [{ ...minimal, limit: 0 }],
    [{ ...minimal, limit: 201 }],
    [{ ...minimal, graceHours: 25 }],
    [{ ...minimal, refreshIntervalMinutes: 4 }],
    [{ ...minimal, refreshIntervalMinutes: 1441 }],
    [{ ...minimal, itemDurationSeconds: 0 }],
    [{ ...minimal, transition: 'spin' }],
    [{ ...minimal, transitionDurationMs: 3001 }],
    [{ ...minimal, sort: 'random' }],
    [{ ...minimal, genres: { match: 'some', values: [] } }],
    [{ ...minimal, genres: null }],
    [{ ...minimal, venues: [1] }],
    [{ ...minimal, dateFrom: { mode: 'fixed' } }],
    [{ ...minimal, dateFrom: { mode: 'fixed', date: '31.01.2027' } }],
    [{ ...minimal, dateFrom: { mode: 'relativeDays', days: -1 } }],
    [{ ...minimal, dateFrom: { mode: 'none' } }],
    [{ ...minimal, dateTo: { mode: 'today' } }],
    [{ ...minimal, dateTo: { mode: 'relativeDays' } }],
    [{ ...minimal, dateTo: { mode: 'fixed', date: 'tomorrow' } }],
  ])('rejects %j', async (plain) => {
    const errors = await validate(toDto(plain));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreatePlaylistDto', () => {
  it('validates the nested rule of a dynamic playlist', async () => {
    const dto = plainToInstance(CreatePlaylistDto, {
      name: 'Metal',
      kind: PlaylistKind.Dynamic,
      rule: { ...minimal, limit: 0 },
    });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('requires a rule for a dynamic playlist', async () => {
    const dto = plainToInstance(CreatePlaylistDto, { name: 'Metal', kind: PlaylistKind.Dynamic });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('accepts a static playlist without a rule', async () => {
    const dto = plainToInstance(CreatePlaylistDto, { name: 'Loop' });

    expect(await validate(dto)).toHaveLength(0);
  });
});
