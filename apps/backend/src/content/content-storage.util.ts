import * as fs from 'fs/promises';
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
  return path.join(basePath, organisationId, 'originals', `${contentId}.${ext}`);
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
  return path.join(basePath, organisationId, 'transcoded', `${contentId}.${targetExt}`);
}

/**
 * Returns the filesystem path for a content's precomputed thumbnail (small WebP).
 * Lives alongside the transcoded file so org/content media cleanup covers it.
 * Structure: {basePath}/{organisationId}/transcoded/{contentId}_thumb.webp
 */
export function getThumbnailPath(
  basePath: string,
  organisationId: string,
  contentId: string,
): string {
  return path.join(basePath, organisationId, 'transcoded', `${contentId}_thumb.webp`);
}

/**
 * Returns the per-organisation media directory (holds the `originals/` and
 * `transcoded/` subtrees for every content item of that org).
 * Structure: {basePath}/{organisationId}
 */
export function getOrganisationMediaDir(basePath: string, organisationId: string): string {
  return path.join(basePath, organisationId);
}

/**
 * Recursively remove an organisation's entire media directory (originals +
 * transcoded). Best-effort: `force` swallows a missing directory so this is safe
 * to call after the org rows are already deleted.
 */
export async function removeOrganisationMedia(
  basePath: string,
  organisationId: string,
  /**
   * Absolute paths of files that belong to the org but sit outside its media
   * directory. Slices written before they were org-scoped live under
   * `{base}/slices/...` and would otherwise outlive the organisation.
   */
  legacyPaths: readonly string[] = [],
): Promise<void> {
  await fs.rm(getOrganisationMediaDir(basePath, organisationId), { recursive: true, force: true });

  const orgDir = getOrganisationMediaDir(basePath, organisationId);
  const resolvedBase = path.resolve(basePath);
  for (const filePath of legacyPaths) {
    const resolved = path.resolve(filePath);
    // Never follow a path out of the media root, and skip anything already
    // covered by the directory removal above.
    if (
      !resolved.startsWith(resolvedBase + path.sep) ||
      resolved.startsWith(path.resolve(orgDir))
    ) {
      continue;
    }
    await fs.rm(resolved, { force: true });
  }
}
