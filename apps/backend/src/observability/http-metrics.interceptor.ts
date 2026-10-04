import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL } from './observability.constants';

const MS_PER_SECOND = 1000;

interface MatchedRoute {
  path?: string;
}

/**
 * Records `http_requests_total` and `http_request_duration_seconds` for every
 * HTTP request.
 *
 * Uses the **route template** (`/api/screens/:id`), not the concrete URL: a URL
 * with a UUID would explode series cardinality. The template is read from the
 * Express route Nest matched; a request that matches no route (404) is bucketed
 * under a single `<unmatched>` label for the same reason.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUESTS_TOTAL) private readonly requests: Counter<string>,
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly duration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const method = request.method;
    const start = Date.now();

    const observe = (): void => {
      const seconds = (Date.now() - start) / MS_PER_SECOND;
      const labels = {
        method,
        route: this.routeTemplate(request),
        status: String(response.statusCode),
      };
      this.requests.inc(labels);
      this.duration.observe(labels, seconds);
    };

    return next.handle().pipe(
      tap({
        next: observe,
        // Record errored requests too; the status code is already set by Nest's
        // exception layer by the time the error propagates here.
        error: observe,
      }),
    );
  }

  /**
   * The matched route template, prefixed with the Express mount path so the
   * global `api` prefix is included (`/api/screens/:id`). Falls back to a single
   * low-cardinality bucket when nothing matched.
   */
  private routeTemplate(request: Request & { route?: MatchedRoute; baseUrl?: string }): string {
    const path = request.route?.path;
    if (!path) {
      return '<unmatched>';
    }
    const base = request.baseUrl ?? '';
    const combined = `${base}${path}`.replace(/\/{2,}/g, '/');
    return combined || path;
  }
}
