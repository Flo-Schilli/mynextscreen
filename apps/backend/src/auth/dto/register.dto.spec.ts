import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const valid = { email: 'owner@example.com', password: 'supersecret', organisationName: 'Acme' };

async function failedFields(body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(RegisterDto, body));
  return errors.map((e) => e.property);
}

describe('RegisterDto', () => {
  it('accepts a signup without a time zone', async () => {
    await expect(failedFields(valid)).resolves.toEqual([]);
  });

  it('accepts an IANA time zone', async () => {
    await expect(failedFields({ ...valid, timeZone: 'Europe/Berlin' })).resolves.toEqual([]);
  });

  it('rejects an unknown time zone', async () => {
    await expect(failedFields({ ...valid, timeZone: 'Europe/Atlantis' })).resolves.toEqual([
      'timeZone',
    ]);
  });
});
