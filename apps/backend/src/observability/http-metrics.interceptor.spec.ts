import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { of, throwError, lastValueFrom } from 'rxjs';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

interface FakeRequest {
  method: string;
  route?: { path?: string };
  baseUrl?: string;
}

function httpContext(request: FakeRequest, statusCode = 200): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('HttpMetricsInterceptor', () => {
  let requests: jest.Mocked<Pick<Counter<string>, 'inc'>>;
  let duration: jest.Mocked<Pick<Histogram<string>, 'observe'>>;
  let interceptor: HttpMetricsInterceptor;

  beforeEach(() => {
    requests = { inc: jest.fn() };
    duration = { observe: jest.fn() };
    interceptor = new HttpMetricsInterceptor(
      requests as unknown as Counter<string>,
      duration as unknown as Histogram<string>,
    );
  });

  it('counts a successful request under the route template, not the concrete URL', async () => {
    const request: FakeRequest = {
      method: 'GET',
      baseUrl: '/api',
      route: { path: '/screens/:id' },
    };
    const next: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(interceptor.intercept(httpContext(request, 200), next));

    expect(requests.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/api/screens/:id',
      status: '200',
    });
    expect(duration.observe).toHaveBeenCalledTimes(1);
    const call = duration.observe.mock.calls[0] as unknown as [Record<string, string>, number];
    expect(call[0]).toEqual({ method: 'GET', route: '/api/screens/:id', status: '200' });
    expect(typeof call[1]).toBe('number');
  });

  it('buckets an unmatched route under <unmatched>', async () => {
    const request: FakeRequest = { method: 'POST' };
    const next: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(interceptor.intercept(httpContext(request, 404), next));

    expect(requests.inc).toHaveBeenCalledWith({
      method: 'POST',
      route: '<unmatched>',
      status: '404',
    });
  });

  it('records errored requests too', async () => {
    const request: FakeRequest = { method: 'GET', baseUrl: '/api', route: { path: '/boom' } };
    const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(
      lastValueFrom(interceptor.intercept(httpContext(request, 500), next)),
    ).rejects.toThrow('boom');

    expect(requests.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/api/boom',
      status: '500',
    });
  });

  it('is a no-op for non-http contexts', async () => {
    const context = { getType: () => 'rpc' } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(requests.inc).not.toHaveBeenCalled();
    expect(duration.observe).not.toHaveBeenCalled();
  });
});
