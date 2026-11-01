import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginMfaDto } from './login-mfa.dto';

async function errorsFor(body: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(LoginMfaDto, body));
  return errors.map((error) => error.property);
}

describe('LoginMfaDto', () => {
  it('accepts a 6-digit code', async () => {
    expect(await errorsFor({ code: '123456' })).toEqual([]);
  });

  it('accepts a recovery code with or without dash, any case', async () => {
    expect(await errorsFor({ recoveryCode: 'abcde-fgh23' })).toEqual([]);
    expect(await errorsFor({ recoveryCode: 'ABCDEFGH23' })).toEqual([]);
  });

  it('requires one of the two', async () => {
    expect(await errorsFor({})).toEqual(['code']);
  });

  it('rejects malformed values', async () => {
    expect(await errorsFor({ code: '12345' })).toEqual(['code']);
    expect(await errorsFor({ code: 'abcdef' })).toEqual(['code']);
    expect(await errorsFor({ recoveryCode: 'abcde-fgh1!' })).toEqual(['recoveryCode']);
  });
});
