import { validate } from 'class-validator';
import { IsTimeZone } from './time-zone.validators';

class Probe {
  @IsTimeZone()
  timeZone!: unknown;
}

async function errorsFor(timeZone: unknown): Promise<string[]> {
  const probe = Object.assign(new Probe(), { timeZone });
  const errors = await validate(probe);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('IsTimeZone', () => {
  it('accepts an IANA zone', async () => {
    await expect(errorsFor('Europe/Berlin')).resolves.toEqual([]);
  });

  it.each([['Europe/Atlantis'], [''], [42], [null]])(
    'rejects %p with a readable message',
    async (value) => {
      await expect(errorsFor(value)).resolves.toEqual([
        'timeZone must be an IANA time zone such as Europe/Berlin',
      ]);
    },
  );
});
