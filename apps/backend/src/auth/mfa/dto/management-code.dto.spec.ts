import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecoveryCodesRegenerateDto } from './recovery-codes-regenerate.dto';
import { TotpDisableDto } from './totp-disable.dto';
import { TotpSetupDto } from './totp-setup.dto';

const DTOS = [TotpSetupDto, TotpDisableDto, RecoveryCodesRegenerateDto] as const;

async function codeErrors(dto: (typeof DTOS)[number], code: string): Promise<string[]> {
  const errors = await validate(plainToInstance(dto, { currentPassword: 'pw', code }));
  return errors.map((error) => error.property);
}

describe.each(DTOS)('%p code of a management action', (dto) => {
  it('accepts a 6-digit TOTP code', async () => {
    expect(await codeErrors(dto, '123456')).toEqual([]);
  });

  it('accepts a recovery code with or without dash, any case', async () => {
    expect(await codeErrors(dto, 'abcde-fgh23')).toEqual([]);
    expect(await codeErrors(dto, 'ABCDEFGH23')).toEqual([]);
  });

  it('rejects anything else', async () => {
    for (const code of ['12345', '1234567', 'abcdef', 'abcde-fgh1!', '123456abcde-fgh23']) {
      expect(await codeErrors(dto, code)).toEqual(['code']);
    }
  });
});
