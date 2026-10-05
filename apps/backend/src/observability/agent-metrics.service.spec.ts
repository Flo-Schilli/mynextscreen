import { Gauge } from 'prom-client';
import { AgentMetricsService } from './agent-metrics.service';
import type { AgentMetricsSnapshot } from './agent-metrics.types';

function gaugeMock(): jest.Mocked<Pick<Gauge<string>, 'set'>> {
  return { set: jest.fn() };
}

describe('AgentMetricsService', () => {
  const agentId = 'agent-1';
  let gauges: Record<string, jest.Mocked<Pick<Gauge<string>, 'set'>>>;
  let service: AgentMetricsService;

  const snapshot: AgentMetricsSnapshot = {
    uptimeSeconds: 120,
    memoryRssBytes: 50_000_000,
    connected: true,
    lastConfigPullAtMs: 1_700_000_000_000,
    screenCount: 2,
    screens: [
      {
        screenId: 'screen-a',
        reachable: true,
        failures: 0,
        devmodeActive: true,
        devmodeExtensions: 3,
        launches: 5,
        wakes: 1,
      },
      {
        screenId: 'screen-b',
        reachable: false,
        failures: 4,
        devmodeActive: false,
        devmodeExtensions: 0,
        launches: 0,
        wakes: 0,
      },
    ],
  };

  beforeEach(() => {
    gauges = {
      up: gaugeMock(),
      uptime: gaugeMock(),
      memoryRss: gaugeMock(),
      connected: gaugeMock(),
      lastConfigPull: gaugeMock(),
      screensTotal: gaugeMock(),
      screenReachable: gaugeMock(),
      screenFailures: gaugeMock(),
      screenDevmodeActive: gaugeMock(),
      screenDevmodeExtensions: gaugeMock(),
      screenLaunches: gaugeMock(),
      screenWakes: gaugeMock(),
    };
    service = new AgentMetricsService(
      gauges.up as unknown as Gauge<string>,
      gauges.uptime as unknown as Gauge<string>,
      gauges.memoryRss as unknown as Gauge<string>,
      gauges.connected as unknown as Gauge<string>,
      gauges.lastConfigPull as unknown as Gauge<string>,
      gauges.screensTotal as unknown as Gauge<string>,
      gauges.screenReachable as unknown as Gauge<string>,
      gauges.screenFailures as unknown as Gauge<string>,
      gauges.screenDevmodeActive as unknown as Gauge<string>,
      gauges.screenDevmodeExtensions as unknown as Gauge<string>,
      gauges.screenLaunches as unknown as Gauge<string>,
      gauges.screenWakes as unknown as Gauge<string>,
    );
  });

  it('marks the agent up and mirrors agent-level values', () => {
    service.record(agentId, snapshot);

    expect(gauges.up.set).toHaveBeenCalledWith({ agent: agentId }, 1);
    expect(gauges.uptime.set).toHaveBeenCalledWith({ agent: agentId }, 120);
    expect(gauges.memoryRss.set).toHaveBeenCalledWith({ agent: agentId }, 50_000_000);
    expect(gauges.connected.set).toHaveBeenCalledWith({ agent: agentId }, 1);
    expect(gauges.screensTotal.set).toHaveBeenCalledWith({ agent: agentId }, 2);
  });

  it('converts the last config pull from ms to seconds', () => {
    service.record(agentId, snapshot);
    expect(gauges.lastConfigPull.set).toHaveBeenCalledWith({ agent: agentId }, 1_700_000_000);
  });

  it('reports 0 for the config-pull timestamp when never pulled', () => {
    service.record(agentId, { ...snapshot, lastConfigPullAtMs: 0 });
    expect(gauges.lastConfigPull.set).toHaveBeenCalledWith({ agent: agentId }, 0);
  });

  it('emits per-screen series labelled by agent and screen', () => {
    service.record(agentId, snapshot);

    expect(gauges.screenReachable.set).toHaveBeenCalledWith(
      { agent: agentId, screen: 'screen-a' },
      1,
    );
    expect(gauges.screenReachable.set).toHaveBeenCalledWith(
      { agent: agentId, screen: 'screen-b' },
      0,
    );
    expect(gauges.screenFailures.set).toHaveBeenCalledWith(
      { agent: agentId, screen: 'screen-b' },
      4,
    );
    expect(gauges.screenDevmodeExtensions.set).toHaveBeenCalledWith(
      { agent: agentId, screen: 'screen-a' },
      3,
    );
    expect(gauges.screenLaunches.set).toHaveBeenCalledWith(
      { agent: agentId, screen: 'screen-a' },
      5,
    );
    expect(gauges.screenWakes.set).toHaveBeenCalledWith({ agent: agentId, screen: 'screen-a' }, 1);
  });
});
