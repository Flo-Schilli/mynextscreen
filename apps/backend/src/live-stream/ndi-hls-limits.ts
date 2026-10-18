import type { ConfigService } from '@nestjs/config';

export const DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * The upload size limit for NDI HLS files, from `NDI_HLS_MAX_UPLOAD_BYTES`.
 * One reader for the raw body parser in `main.ts` and the storage service, so
 * both always enforce the same, validated number: a positive integer, else the
 * default.
 */
export function resolveNdiHlsMaxUploadBytes(config: Pick<ConfigService, 'get'>): number {
  const configured = Number(
    config.get<string | number>('NDI_HLS_MAX_UPLOAD_BYTES', DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES),
  );
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES;
}
