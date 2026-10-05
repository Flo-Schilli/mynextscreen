import { Test, TestingModule } from '@nestjs/testing';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { register } from 'prom-client';
import { observabilityMetricProviders } from './observability.providers';
import {
  BULLMQ_JOB_DURATION_SECONDS,
  BULLMQ_QUEUE_JOBS,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
  LIVE_STREAMS_ACTIVE,
  PG_POOL_CONNECTIONS,
  SCREENS_TOTAL,
  SSE_ACTIVE_CONNECTIONS,
  AGENT_UP,
  AGENT_SCREEN_REACHABLE,
} from './observability.constants';

describe('observability metric registration', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    register.clear();
    moduleRef = await Test.createTestingModule({
      imports: [PrometheusModule.register({ defaultMetrics: { enabled: false } })],
      providers: [...observabilityMetricProviders],
    }).compile();
    await moduleRef.init();
  });

  afterEach(async () => {
    await moduleRef.close();
    register.clear();
  });

  it('registers every expected custom series in the default registry', () => {
    const names = new Set(register.getMetricsAsArray().map((m) => m.name));
    for (const name of [
      HTTP_REQUESTS_TOTAL,
      HTTP_REQUEST_DURATION_SECONDS,
      BULLMQ_QUEUE_JOBS,
      BULLMQ_JOB_DURATION_SECONDS,
      SSE_ACTIVE_CONNECTIONS,
      SCREENS_TOTAL,
      LIVE_STREAMS_ACTIVE,
      PG_POOL_CONNECTIONS,
      AGENT_UP,
      AGENT_SCREEN_REACHABLE,
    ]) {
      expect(names).toContain(name);
    }
  });

  it('serialises the registered series on scrape', async () => {
    const output = await register.metrics();
    expect(output).toContain(`# TYPE ${HTTP_REQUESTS_TOTAL} counter`);
    expect(output).toContain(`# TYPE ${SCREENS_TOTAL} gauge`);
    expect(output).toContain(`# TYPE ${HTTP_REQUEST_DURATION_SECONDS} histogram`);
  });
});
