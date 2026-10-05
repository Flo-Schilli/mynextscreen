import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import type { NextFunction, Request, Response } from 'express';
import { HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL } from './observability.constants';

const MS_PER_SECOND = 1000;

interface MatchedRoute {
  path?: string;
}

/**
 * Records `http_requests_total` and `http_request_duration_seconds` for every
 * HTTP request.
 *
 * Middleware on the response's `finish` event rather than an interceptor, for
 * two reasons that both come down to Nest's order (middleware → guards →
 * interceptors → handler → exception filters):
 *
 * - An interceptor's `tap({error})` runs while the exception is still
 *   propagating, *before* the filter sets the status, so `response.statusCode`
 *   is still the route's success default — a 500 would be counted as a 200.
 * - A request a guard rejects never reaches an interceptor at all, so every
 *   401/403 would be missing from the metric entirely.
 *
 * By `finish` the real status is on the wire, whichever path produced it.
 *
 * Uses the **route template** (`/api/screens/:id`), not the concrete URL: a URL
 * with a UUID would explode series cardinality. The template is read from the
 * Express route Nest matched; a request that matches no route (404) is bucketed
 * under a single `<unmatched>` label for the same reason.
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric(HTTP_REQUESTS_TOTAL) private readonly requests: Counter<string>,
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly duration: Histogram<string>,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const method = request.method;
    const start = Date.now();

    response.once('finish', () => {
      const seconds = (Date.now() - start) / MS_PER_SECOND;
      const labels = {
        method,
        route: this.routeTemplate(request),
        status: String(response.statusCode),
      };
      // A metric must never be the reason a request fails, and this runs after
      // the response is already on the wire, where throwing would surface as an
      // unhandled rejection rather than anything actionable.
      try {
        this.requests.inc(labels);
        this.duration.observe(labels, seconds);
      } catch {
        // Nothing to do: the request succeeded, only its bookkeeping did not.
      }
    });

    next();
  }

  /**
   * The matched route template, prefixed with the Express mount path so the
   * global `api` prefix is included (`/api/screens/:id`). Falls back to a single
   * low-cardinality bucket when nothing matched.
   */
  private routeTemplate(request: Request & { route?: MatchedRoute; baseUrl?: string }): string {
    const path = request.route?.path;
    if (!path || path.includes('*')) {
      // No route, or the catch-all Express 5 registers for the global prefix
      // (`/api*path`) — which is what an unknown path under `/api` matches. No
      // controller in this app declares a wildcard route, so a `*` here always
      // means "nothing real matched".
      return '<unmatched>';
    }
    const base = request.baseUrl ?? '';
    const combined = `${base}${path}`.replace(/\/{2,}/g, '/');
    return combined || path;
  }
}
