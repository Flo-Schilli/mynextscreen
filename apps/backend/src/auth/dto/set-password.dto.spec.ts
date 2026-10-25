import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetPasswordDto } from './set-password.dto';

const valid = { token: 'tok', newPassword: 'supersecret' };

async function failedFields(body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(SetPasswordDto, body));
  return errors.map((e) => e.property);
}

describe('SetPasswordDto', () => {
  it('accepts a password reset without a name', async () => {
    await expect(failedFields(valid)).resolves.toEqual([]);
  });

  it('accepts an activation with a name', async () => {
    await expect(failedFields({ ...valid, name: 'Jane Doe' })).resolves.toEqual([]);
  });

  it('trims the name', () => {
    expect(plainToInstance(SetPasswordDto, { ...valid, name: '  Jane Doe ' }).name).toBe(
      'Jane Doe',
    );
  });

  it.each([[''], ['   '], ['x'.repeat(256)], [42]])('rejects the name %p', async (name) => {
    await expect(failedFields({ ...valid, name })).resolves.toEqual(['name']);
  });
});
