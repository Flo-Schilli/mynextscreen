import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Longest license text accepted, in bytes, per text. */
export const CAPTURE_LICENSE_TEXT_MAX_BYTES = 256 * 1024;

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * The license texts an agent read from its capture plugin. The server does not
 * trust the hashes: it recomputes them from the texts (see
 * `CapturePluginLicenseTextService`).
 */
export class UploadCaptureLicenseTextDto {
  @Matches(SHA256_HEX)
  licenseSha256!: string;

  @Matches(SHA256_HEX)
  ndiLicenseSha256!: string;

  @Matches(SHA256_HEX)
  termsSha256!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(CAPTURE_LICENSE_TEXT_MAX_BYTES)
  ndiLicenseText!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(CAPTURE_LICENSE_TEXT_MAX_BYTES)
  termsText!: string;
}
