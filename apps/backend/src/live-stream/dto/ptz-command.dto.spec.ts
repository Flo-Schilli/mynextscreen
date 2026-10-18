import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PtzCommandDto, toPtzCommand } from './ptz-command.dto';

async function failedProperties(payload: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(PtzCommandDto, payload));
  return errors.map((e) => e.property).sort();
}

describe('PtzCommandDto', () => {
  it.each([
    { action: 'stop' },
    { action: 'home' },
    { action: 'move', direction: 'up_left', speed: 1 },
    { action: 'move', direction: 'down', speed: 10 },
    { action: 'zoom', direction: 'in', speed: 7 },
    { action: 'zoom', direction: 'out', speed: 1 },
    { action: 'preset_recall', preset: 0 },
    { action: 'preset_store', preset: 15 },
  ])('accepts %j', async (payload) => {
    expect(await failedProperties(payload)).toEqual([]);
  });

  it.each([{}, { action: 'spin' }, { action: 5 }])('rejects action in %j', async (payload) => {
    expect(await failedProperties(payload)).toEqual(['action']);
  });

  it.each([
    [{ action: 'move' }, ['direction', 'speed']],
    [{ action: 'move', direction: 'in', speed: 5 }, ['direction']],
    [{ action: 'move', direction: 'up', speed: 0 }, ['speed']],
    [{ action: 'move', direction: 'up', speed: 11 }, ['speed']],
    [{ action: 'move', direction: 'up', speed: 2.5 }, ['speed']],
    [{ action: 'move', direction: 'up', speed: '5' }, ['speed']],
    [{ action: 'zoom', direction: 'up', speed: 3 }, ['direction']],
    [{ action: 'zoom', direction: 'in', speed: 8 }, ['speed']],
    [{ action: 'zoom', direction: 'in', speed: 0 }, ['speed']],
    [{ action: 'preset_recall' }, ['preset']],
    [{ action: 'preset_recall', preset: 16 }, ['preset']],
    [{ action: 'preset_store', preset: -1 }, ['preset']],
    [{ action: 'preset_store', preset: 1.5 }, ['preset']],
  ])('rejects %j', async (payload, expected) => {
    expect(await failedProperties(payload)).toEqual(expected);
  });

  it('ignores fields that do not belong to the action', async () => {
    expect(
      await failedProperties({ action: 'home', speed: 99, preset: 99, direction: 'x' }),
    ).toEqual([]);
  });
});

describe('toPtzCommand', () => {
  const dto = (payload: Record<string, unknown>): PtzCommandDto =>
    plainToInstance(PtzCommandDto, payload);

  it('keeps only the fields of the action', () => {
    const stray = { speed: 3, preset: 2, direction: 'up' };

    expect(toPtzCommand(dto({ action: 'home', ...stray }))).toEqual({ action: 'home' });
    expect(toPtzCommand(dto({ action: 'stop', ...stray }))).toEqual({ action: 'stop' });
    expect(toPtzCommand(dto({ action: 'move', ...stray }))).toEqual({
      action: 'move',
      direction: 'up',
      speed: 3,
    });
    expect(toPtzCommand(dto({ action: 'zoom', direction: 'out', speed: 4, preset: 1 }))).toEqual({
      action: 'zoom',
      direction: 'out',
      speed: 4,
    });
    expect(toPtzCommand(dto({ action: 'preset_store', ...stray }))).toEqual({
      action: 'preset_store',
      preset: 2,
    });
    expect(toPtzCommand(dto({ action: 'preset_recall', preset: 7 }))).toEqual({
      action: 'preset_recall',
      preset: 7,
    });
  });
});
