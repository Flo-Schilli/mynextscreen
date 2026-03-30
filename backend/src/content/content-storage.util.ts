import * as path from 'path';

/**
 * Returns the filesystem path for a content original file.
 * Structure: {basePath}/{organisationId}/originals/{contentId}.{ext}
 */
export function getOriginalPath(
  basePath: string,
  organisationId: string,
  contentId: string,
  ext: string,
): string {
  return path.join(
    basePath,
    organisationId,
    'originals',
    `${contentId}.${ext}`,
  );
}

/**
 * Returns the filesystem path for a content transcoded file.
 * Structure: {basePath}/{organisationId}/transcoded/{contentId}.{targetExt}
 */
export function getTranscodedPath(
  basePath: string,
  organisationId: string,
  contentId: string,
  targetExt: string,
): string {
  return path.join(
    basePath,
    organisationId,
    'transcoded',
    `${contentId}.${targetExt}`,
  );
}
