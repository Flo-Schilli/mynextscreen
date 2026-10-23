import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventScheduleRuleDto, UpdateEventScheduleRuleDto } from './event-schedule-rule.dto';

async function errorsOf<T extends object>(cls: new () => T, plain: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
}

describe('event schedule rule DTOs', () => {
  const valid = {
    name: 'Hirsch-Abend',
    venues: ['Hirsch'],
    playlistId: '550e8400-e29b-41d4-a716-446655440000',
    windowStart: '18:00',
    windowEnd: '01:00',
    screenIds: ['660e8400-e29b-41d4-a716-446655440000'],
    groupIds: [],
    excludeCancelled: true,
    colour: '#6d6cf6',
    enabled: true,
  };

  it('accepts a complete rule', async () => {
    await expect(errorsOf(CreateEventScheduleRuleDto, valid)).resolves.toEqual([]);
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ venues: [] }, 'venues'],
    [{ venues: ['Hirsch', 'Hirsch'] }, 'venues'],
    [{ playlistId: 'nope' }, 'playlistId'],
    [{ windowStart: '24:00' }, 'windowStart'],
    [{ windowEnd: '7:30' }, 'windowEnd'],
    [{ screenIds: ['nope'] }, 'screenIds'],
    [{ groupIds: 'x' }, 'groupIds'],
    [{ colour: 'red' }, 'colour'],
    [{ enabled: 'yes' }, 'enabled'],
  ])('rejects %j', async (patch, property) => {
    await expect(errorsOf(CreateEventScheduleRuleDto, { ...valid, ...patch })).resolves.toContain(
      property,
    );
  });

  it('accepts an empty update and rejects a bad field in one', async () => {
    await expect(errorsOf(UpdateEventScheduleRuleDto, {})).resolves.toEqual([]);
    await expect(errorsOf(UpdateEventScheduleRuleDto, { windowStart: '18:60' })).resolves.toEqual([
      'windowStart',
    ]);
  });
});
