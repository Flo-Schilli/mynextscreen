import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { requireBearerHeader } from '../live-stream/require-bearer-header';

/**
 * Two license texts of up to 256 KiB each, JSON-escaped (worst case six bytes
 * per character). The default JSON limit (100 kB) would reject them.
 */
export const CAPTURE_LICENSE_TEXT_BODY_LIMIT = '4mb';

export interface BodyParserOptions {
  /** Route whose JSON body may exceed the default limit; Bearer header required. */
  readonly licenseTextRoute: string;
}

/**
 * Registers the body parsers explicitly. The app must be created with
 * `bodyParser: false`: Nest skips its own global `json()` when it finds an
 * already registered middleware named `jsonParser`, and a path-scoped
 * `json()` has that name, so without this every route outside the scoped one
 * would receive an empty body.
 *
 * The scoped parser comes first and marks the request as parsed; the global
 * one then skips it. The cheap Bearer check keeps unauthenticated clients
 * from making the server buffer the large body.
 */
export function registerBodyParsers(app: INestApplication, options: BodyParserOptions): void {
  app.use(
    options.licenseTextRoute,
    requireBearerHeader,
    json({ limit: CAPTURE_LICENSE_TEXT_BODY_LIMIT }),
  );
  app.use(json());
  app.use(urlencoded({ extended: true }));
}
