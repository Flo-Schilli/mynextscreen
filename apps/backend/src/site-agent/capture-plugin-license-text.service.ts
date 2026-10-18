import { createHash } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { capturePluginLicenseTexts, type CapturePluginLicenseText } from '../db/schema';
import { CAPTURE_LICENSE_TEXT_MAX_BYTES, type UploadCaptureLicenseTextDto } from './dto';

const sha256Hex = (data: string): string => createHash('sha256').update(data, 'utf8').digest('hex');

/**
 * The combination rule of the capture plugin (`acceptanceHash` there): an
 * acceptance quotes `sha256(ndiLicenseSha256 + "\n" + termsSha256)`.
 */
export const combineLicenseHashes = (ndiLicenseSha256: string, termsSha256: string): string =>
  sha256Hex(`${ndiLicenseSha256}\n${termsSha256}`);

/**
 * Stores the license texts agents read from their capture plugin, keyed by the
 * hash an acceptance quotes. The agent's word is never taken for the hashes:
 * both are recomputed from the texts, so a stored row can only hold the exact
 * text its key names.
 */
@Injectable()
export class CapturePluginLicenseTextService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Idempotent: the same texts uploaded again change nothing. */
  async store(dto: UploadCaptureLicenseTextDto): Promise<void> {
    for (const text of [dto.ndiLicenseText, dto.termsText]) {
      if (Buffer.byteLength(text, 'utf8') > CAPTURE_LICENSE_TEXT_MAX_BYTES) {
        throw new BadRequestException('License text is too large');
      }
    }
    const ndiLicenseSha256 = sha256Hex(dto.ndiLicenseText);
    const termsSha256 = sha256Hex(dto.termsText);
    if (
      ndiLicenseSha256 !== dto.ndiLicenseSha256 ||
      termsSha256 !== dto.termsSha256 ||
      combineLicenseHashes(ndiLicenseSha256, termsSha256) !== dto.licenseSha256
    ) {
      throw new BadRequestException('License hashes do not match the uploaded texts');
    }
    await this.db
      .insert(capturePluginLicenseTexts)
      .values({
        licenseSha256: dto.licenseSha256,
        ndiLicenseSha256,
        termsSha256,
        ndiLicenseText: dto.ndiLicenseText,
        termsText: dto.termsText,
      })
      .onConflictDoNothing();
  }

  async find(licenseSha256: string): Promise<CapturePluginLicenseText | undefined> {
    const [row] = await this.db
      .select()
      .from(capturePluginLicenseTexts)
      .where(eq(capturePluginLicenseTexts.licenseSha256, licenseSha256))
      .limit(1);
    return row;
  }
}
