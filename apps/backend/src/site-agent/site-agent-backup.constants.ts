/**
 * Body limit for the two routes that carry a backup file. Above the base64 cap
 * in the DTO so validation, not the parser, is what turns away an oversized
 * file — with a message that says so.
 */
export const BACKUP_BODY_LIMIT = '4mb';

/**
 * Routes that need the larger limit. Everything else keeps the parser's default,
 * so raising it for backups does not widen what any other endpoint accepts.
 */
export const BACKUP_UPLOAD_PATHS = [
  '/api/agents/me/backups/exports',
  '/api/site-agents/:id/backups/import',
];
