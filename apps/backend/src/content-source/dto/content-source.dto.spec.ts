import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateContentSourceDto } from './create-content-source.dto';
import { UpdateContentSourceDto } from './update-content-source.dto';
import { SourceEventsQueryDto, SourceFacetsQueryDto } from './source-events-query.dto';
import { venueAliasListProblem } from './venue-alias.dto';

async function errorsOf<T extends object>(cls: new () => T, plain: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
}

describe('content source DTOs', () => {
  const valid = {
    name: 'Concerts',
    adapterType: 'concertbuero-franken',
    params: { monthsAhead: 6 },
    formats: ['1920x1080', '1080x1920'],
    style: { background: 'blur', accentColor: '#E30613' },
    syncIntervalMinutes: 360,
    enabled: true,
  };

  it('accepts a complete source', async () => {
    await expect(errorsOf(CreateContentSourceDto, valid)).resolves.toEqual([]);
  });

  it.each([
    [{ formats: [] }, 'formats'],
    [{ formats: ['800x600'] }, 'formats'],
    [{ formats: ['1920x1080', '1920x1080'] }, 'formats'],
    [{ style: { background: 'white', accentColor: '#000000' } }, 'style'],
    [{ style: { background: 'black', accentColor: 'red' } }, 'style'],
    [{ syncIntervalMinutes: 5 }, 'syncIntervalMinutes'],
    [{ name: '' }, 'name'],
    [{ params: 'x' }, 'params'],
  ])('rejects %j', async (patch, property) => {
    await expect(errorsOf(CreateContentSourceDto, { ...valid, ...patch })).resolves.toContain(
      property,
    );
  });

  describe('venue aliases', () => {
    const withAliases = (venueAliases: unknown) => ({ venueAliases });

    it('accepts a one-level alias list and trims the names', async () => {
      const dto = plainToInstance(
        UpdateContentSourceDto,
        withAliases([
          { raw: ' Der Hirsch ', canonical: 'Hirsch ' },
          { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
          { raw: 'Z-Bau (Saal)', canonical: 'Z-Bau' },
        ]),
      );

      await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
        [],
      );
      expect(dto.venueAliases?.[0]).toMatchObject({ raw: 'Der Hirsch', canonical: 'Hirsch' });
      await expect(
        errorsOf(CreateContentSourceDto, { ...valid, venueAliases: [] }),
      ).resolves.toEqual([]);
    });

    it.each([
      ['an empty raw name', [{ raw: '  ', canonical: 'Hirsch' }]],
      ['an empty canonical name', [{ raw: 'Der Hirsch', canonical: '' }]],
      ['a too long name', [{ raw: 'x'.repeat(201), canonical: 'Hirsch' }]],
      ['a missing field', [{ raw: 'Der Hirsch' }]],
      ['an unknown field', [{ raw: 'Der Hirsch', canonical: 'Hirsch', note: 'x' }]],
      ['a self alias', [{ raw: 'Hirsch', canonical: 'Hirsch' }]],
      [
        'a duplicate raw name',
        [
          { raw: 'Der Hirsch', canonical: 'Hirsch' },
          { raw: 'Der Hirsch', canonical: 'Hirsch Nürnberg' },
        ],
      ],
      [
        'a chain',
        [
          { raw: 'Der Hirsch', canonical: 'Hirsch' },
          { raw: 'Hirsch', canonical: 'Hirsch Nürnberg' },
        ],
      ],
      [
        'a cycle',
        [
          { raw: 'A', canonical: 'B' },
          { raw: 'B', canonical: 'A' },
        ],
      ],
      ['not a list', { raw: 'Der Hirsch', canonical: 'Hirsch' }],
      [
        'too many entries',
        Array.from({ length: 201 }, (_, i) => ({ raw: `Venue ${i}`, canonical: 'Hirsch' })),
      ],
    ])('rejects %s', async (_label, venueAliases) => {
      await expect(errorsOf(UpdateContentSourceDto, withAliases(venueAliases))).resolves.toContain(
        'venueAliases',
      );
    });

    it('names the problem of a chained list', () => {
      expect(
        venueAliasListProblem([
          { raw: 'Der Hirsch', canonical: 'Hirsch' },
          { raw: 'Hirsch', canonical: 'Hirsch Nürnberg' },
        ]),
      ).toMatch(/one level/);
      expect(venueAliasListProblem([{ raw: 'Der Hirsch', canonical: 'Hirsch' }])).toBeNull();
    });
  });

  it('does not let an update change the adapter type', async () => {
    await expect(errorsOf(UpdateContentSourceDto, { adapterType: 'other' })).resolves.toContain(
      'adapterType',
    );
    await expect(errorsOf(UpdateContentSourceDto, { enabled: false })).resolves.toEqual([]);
  });

  it('parses list, boolean and number query parameters', async () => {
    const query = plainToInstance(SourceEventsQueryDto, {
      venues: 'Hirsch, Z-Bau',
      genres: ['Metal', 'Rock,Pop'],
      includeGone: 'true',
      limit: '50',
      offset: '10',
      from: '2026-11-01',
    });

    expect(query).toMatchObject({
      venues: ['Hirsch', 'Z-Bau'],
      genres: ['Metal', 'Rock', 'Pop'],
      includeGone: true,
      limit: 50,
      offset: 10,
    });
    await expect(validate(query)).resolves.toEqual([]);
    expect(plainToInstance(SourceEventsQueryDto, { includeGone: 'false' }).includeGone).toBe(false);
  });

  it('rejects malformed query values', async () => {
    await expect(
      errorsOf(SourceEventsQueryDto, { from: '01.11.2026', limit: '9999', includeGone: 'yes' }),
    ).resolves.toEqual(expect.arrayContaining(['from', 'limit', 'includeGone']));
    await expect(errorsOf(SourceFacetsQueryDto, { sourceIds: 'not-a-uuid' })).resolves.toEqual([
      'sourceIds',
    ]);
    await expect(
      errorsOf(SourceFacetsQueryDto, { sourceIds: '550e8400-e29b-41d4-a716-446655440000' }),
    ).resolves.toEqual([]);
  });
});
