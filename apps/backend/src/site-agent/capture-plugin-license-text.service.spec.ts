import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { capturePluginLicenseTexts } from '../db/schema';
import { closeTestDb, initTestDb, truncateAll } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  CapturePluginLicenseTextService,
  combineLicenseHashes,
} from './capture-plugin-license-text.service';
import { CAPTURE_LICENSE_TEXT_MAX_BYTES, type UploadCaptureLicenseTextDto } from './dto';

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

function upload(
  ndiLicenseText = 'NDI SDK license',
  termsText = 'Plugin terms',
): UploadCaptureLicenseTextDto {
  const ndiLicenseSha256 = sha(ndiLicenseText);
  const termsSha256 = sha(termsText);
  return {
    licenseSha256: combineLicenseHashes(ndiLicenseSha256, termsSha256),
    ndiLicenseSha256,
    termsSha256,
    ndiLicenseText,
    termsText,
  };
}

describe('CapturePluginLicenseTextService', () => {
  let db: DrizzleDB;
  let service: CapturePluginLicenseTextService;

  beforeAll(async () => {
    db = await initTestDb();
  });
  afterAll(async () => {
    await closeTestDb();
  });
  beforeEach(async () => {
    await truncateAll();
    service = new CapturePluginLicenseTextService(db);
  });

  it('combines the hashes as sha256(ndi + newline + terms), as the plugin does', () => {
    expect(combineLicenseHashes('a', 'b')).toBe(sha('a\nb'));
  });

  it('stores texts whose hashes verify and finds them by the combined hash', async () => {
    const dto = upload();

    await service.store(dto);

    const row = await service.find(dto.licenseSha256);
    expect(row).toEqual(
      expect.objectContaining({
        ndiLicenseText: 'NDI SDK license',
        termsText: 'Plugin terms',
        ndiLicenseSha256: dto.ndiLicenseSha256,
        termsSha256: dto.termsSha256,
      }),
    );
  });

  it('is idempotent', async () => {
    const dto = upload();

    await service.store(dto);
    await service.store(dto);

    expect(await db.$count(capturePluginLicenseTexts)).toBe(1);
  });

  it.each([
    ['ndiLicenseSha256', { ndiLicenseSha256: 'f'.repeat(64) }],
    ['termsSha256', { termsSha256: 'f'.repeat(64) }],
    ['licenseSha256', { licenseSha256: 'f'.repeat(64) }],
    ['ndiLicenseText', { ndiLicenseText: 'tampered' }],
    ['termsText', { termsText: 'tampered' }],
  ])('rejects a mismatch in %s and stores nothing', async (_name, override) => {
    await expect(service.store({ ...upload(), ...override })).rejects.toThrow(BadRequestException);

    expect(await db.$count(capturePluginLicenseTexts)).toBe(0);
  });

  it('rejects a text above the byte limit even when its hash is right', async () => {
    const dto = upload('x'.repeat(CAPTURE_LICENSE_TEXT_MAX_BYTES + 1));

    await expect(service.store(dto)).rejects.toThrow('too large');
  });

  it('counts bytes, not characters, against the limit', async () => {
    // Half the limit in characters, but two bytes each.
    const dto = upload('é'.repeat(CAPTURE_LICENSE_TEXT_MAX_BYTES / 2 + 1));

    await expect(service.store(dto)).rejects.toThrow('too large');
  });

  it('answers undefined for an unknown hash', async () => {
    expect(await service.find('0'.repeat(64))).toBeUndefined();
  });
});
