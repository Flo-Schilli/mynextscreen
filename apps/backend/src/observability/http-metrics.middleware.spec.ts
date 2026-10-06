import {
  CanActivate,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  InternalServerErrorException,
  MiddlewareConsumer,
  Module,
  NestModule,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL } from './observability.constants';

/** `@willsoto/nestjs-prometheus` resolves `@InjectMetric(name)` to this token. */
function metricToken(name: string): string {
  return `PROM_METRIC_${name.toUpperCase()}`;
}

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(): boolean {
    throw new ForbiddenException();
  }
}

@Controller()
class ProbeController {
  @Get('ok')
  ok(): string {
    return 'ok';
  }

  @Get('screens/:id')
  screen(): string {
    return 'screen';
  }

  @Get('throws')
  throws(): string {
    throw new InternalServerErrorException();
  }

  @Get('guarded')
  @UseGuards(DenyGuard)
  guarded(): string {
    return 'unreachable';
  }
}

/**
 * Boots a real HTTP server rather than driving the middleware with a fake
 * request. The whole point of these cases is *when* in Nest's lifecycle the
 * status code becomes final, and only the real pipeline answers that.
 */
describe('HttpMetricsMiddleware (real request pipeline)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const inc = jest.fn();
  const observe = jest.fn();

  beforeAll(async () => {
    @Module({
      controllers: [ProbeController],
      providers: [
        { provide: metricToken(HTTP_REQUESTS_TOTAL), useValue: { inc } },
        { provide: metricToken(HTTP_REQUEST_DURATION_SECONDS), useValue: { observe } },
        HttpMetricsMiddleware,
      ],
    })
    class ProbeModule implements NestModule {
      configure(consumer: MiddlewareConsumer): void {
        consumer.apply(HttpMetricsMiddleware).forRoutes('{*splat}');
      }
    }

    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirrors the production prefix so the route label includes it.
    app.setGlobalPrefix('api');
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    inc.mockClear();
    observe.mockClear();
  });

  /** Labels of the single recorded request. */
  function recorded(): Record<string, string> {
    expect(inc).toHaveBeenCalledTimes(1);
    return (inc.mock.calls[0] as unknown as [Record<string, string>])[0];
  }

  it('counts a successful request under the route template, not the concrete URL', async () => {
    const response = await fetch(`${baseUrl}/api/screens/8f6c1d2e-0000-4000-8000-000000000000`);

    expect(response.status).toBe(200);
    expect(recorded()).toEqual({ method: 'GET', route: '/api/screens/:id', status: '200' });
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('labels a throwing handler with the status the client got, not the route default', async () => {
    const response = await fetch(`${baseUrl}/api/throws`);

    expect(response.status).toBe(500);
    expect(recorded().status).toBe('500');
  });

  it('records a request a guard rejected, which never reaches an interceptor', async () => {
    const response = await fetch(`${baseUrl}/api/guarded`);

    expect(response.status).toBe(403);
    expect(recorded()).toEqual({ method: 'GET', route: '/api/guarded', status: '403' });
  });

  it('buckets an unmatched path under <unmatched> so a 404 scan cannot grow the series', async () => {
    const response = await fetch(`${baseUrl}/api/no-such-thing`);

    expect(response.status).toBe(404);
    expect(recorded()).toEqual({ method: 'GET', route: '<unmatched>', status: '404' });
  });

  it('observes a duration in seconds alongside the counter', async () => {
    await fetch(`${baseUrl}/api/ok`);

    const [labels, seconds] = observe.mock.calls[0] as unknown as [Record<string, string>, number];
    expect(labels).toEqual({ method: 'GET', route: '/api/ok', status: '200' });
    expect(typeof seconds).toBe('number');
    expect(seconds).toBeGreaterThanOrEqual(0);
  });
});
