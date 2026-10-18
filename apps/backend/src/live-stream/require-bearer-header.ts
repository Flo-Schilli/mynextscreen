import type { NextFunction, Request, Response } from 'express';

const BEARER_PATTERN = /^Bearer\s+\S+$/i;

/**
 * Cheap pre-filter for routes whose body is buffered before auth runs: rejects
 * a request that carries no `Authorization: Bearer <token>` header with 401.
 * It never verifies the token, the route's guard still does that.
 */
export function requireBearerHeader(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !BEARER_PATTERN.test(header)) {
    res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    return;
  }
  next();
}
