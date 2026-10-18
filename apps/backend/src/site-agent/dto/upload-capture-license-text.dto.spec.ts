import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CAPTURE_LICENSE_TEXT_MAX_BYTES,
  UploadCaptureLicenseTextDto,
} from './upload-capture-license-text.dto';

async function errorsFor(payload: unknown): Promise<number> {
  return (await validate(plainToInstance(UploadCaptureLicenseTextDto, payload))).length;
}

describe('UploadCaptureLicenseTextDto', () => {
  const valid = {
    licenseSha256: 'a'.repeat(64),
    ndiLicenseSha256: 'b'.repeat(64),
    termsSha256: 'c'.repeat(64),
    ndiLicenseText: 'text',
    termsText: 'terms',
  };

  it('accepts a complete body', async () => {
    expect(await errorsFor(valid)).toBe(0);
  });

  it('rejects non-hex or short hashes', async () => {
    expect(await errorsFor({ ...valid, licenseSha256: 'A'.repeat(64) })).toBeGreaterThan(0);
    expect(await errorsFor({ ...valid, termsSha256: 'abc' })).toBeGreaterThan(0);
  });

  it('rejects empty, non-string and oversize texts', async () => {
    expect(await errorsFor({ ...valid, ndiLicenseText: '' })).toBeGreaterThan(0);
    expect(await errorsFor({ ...valid, termsText: 5 })).toBeGreaterThan(0);
    expect(
      await errorsFor({ ...valid, termsText: 'x'.repeat(CAPTURE_LICENSE_TEXT_MAX_BYTES + 1) }),
    ).toBeGreaterThan(0);
  });
});
