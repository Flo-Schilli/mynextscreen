import {
  CAPTURE_PLUGIN_STARTUP_GRACE_MS,
  CAPTURE_PLUGIN_STATUS_TTL_MS,
  CapturePluginStatusService,
} from './capture-plugin-status.service';
import type { AgentCapturePluginReportDto } from './dto/agent-report.dto';

describe('CapturePluginStatusService', () => {
  const hash = (c: string): string => c.repeat(64);
  let service: CapturePluginStatusService;

  const report = (
    overrides: Partial<AgentCapturePluginReportDto> = {},
  ): AgentCapturePluginReportDto => ({ state: 'ready', ...overrides });

  beforeEach(() => {
    service = new CapturePluginStatusService();
  });

  it('stores the latest report with nulls for omitted fields', () => {
    service.record('agent-1', report({ state: 'ready', pluginVersion: '0.1.0' }), 1_000);
    service.record(
      'agent-1',
      report({
        state: 'license_required',
        pluginVersion: '0.2.0',
        apiVersion: '1',
        sdkVersion: '6.3.2.0',
        license: {
          licenseSha256: hash('a'),
          ndiLicenseSha256: hash('b'),
          termsSha256: hash('c'),
        },
      }),
      2_000,
    );

    expect(service.get('agent-1', 2_500)).toEqual({
      state: 'license_required',
      pluginVersion: '0.2.0',
      apiVersion: '1',
      sdkVersion: '6.3.2.0',
      license: {
        licenseSha256: hash('a'),
        ndiLicenseSha256: hash('b'),
        termsSha256: hash('c'),
      },
      errorCode: null,
      acceptedVia: null,
      reportedAt: new Date(2_000).toISOString(),
    });
  });

  it('keeps one entry per agent and never shows another agent its status', () => {
    service.record('agent-1', report({ state: 'error', errorCode: 'runtime_missing' }));

    expect(service.get('agent-2')).toBeUndefined();
    expect(service.get('agent-1')?.errorCode).toBe('runtime_missing');
    expect(service.get('agent-1')?.license).toBeNull();
  });

  it('treats a status older than the TTL as absent', () => {
    service.record('agent-1', report(), 1_000);

    expect(service.get('agent-1', 1_000 + CAPTURE_PLUGIN_STATUS_TTL_MS)).toBeDefined();
    expect(service.get('agent-1', 1_001 + CAPTURE_PLUGIN_STATUS_TTL_MS)).toBeUndefined();
  });

  it('evicts stale entries of other agents when recording', () => {
    service.record('old', report(), 0);
    service.record('new', report(), CAPTURE_PLUGIN_STATUS_TTL_MS + 1);

    expect(service.get('old', CAPTURE_PLUGIN_STATUS_TTL_MS + 1)).toBeUndefined();
  });

  it('clears an entry', () => {
    service.record('agent-1', report());

    service.clear('agent-1');

    expect(service.get('agent-1')).toBeUndefined();
  });

  it('stops accepting new agents at the hard cap but still updates known ones', () => {
    for (let i = 0; i < 2000; i += 1) {
      service.record(`agent-${i}`, report());
    }

    service.record('one-too-many', report());
    service.record('agent-0', report({ state: 'error' }));

    expect(service.get('one-too-many')).toBeUndefined();
    expect(service.get('agent-0')?.state).toBe('error');
  });

  describe('isStatusPending', () => {
    it('is true for an unseen agent inside the startup window only', () => {
      const started = new CapturePluginStatusService(1_000);

      expect(started.isStatusPending('agent-1', 1_000 + CAPTURE_PLUGIN_STARTUP_GRACE_MS - 1)).toBe(
        true,
      );
      expect(started.isStatusPending('agent-1', 1_000 + CAPTURE_PLUGIN_STARTUP_GRACE_MS)).toBe(
        false,
      );
    });

    it('is false once the agent reported, also after its status expired', () => {
      const started = new CapturePluginStatusService(1_000);

      started.record('agent-1', { state: 'ready' }, 2_000);
      started.clear('agent-1');

      expect(started.isStatusPending('agent-1', 3_000)).toBe(false);
    });
  });
});
