import { NDI_STATUS_TTL_MS, NdiStreamStatusService } from './ndi-stream-status.service';
import type { AgentNdiStreamReportDto } from './dto/agent-report.dto';

describe('NdiStreamStatusService', () => {
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  let service: NdiStreamStatusService;

  const report = (overrides: Partial<AgentNdiStreamReportDto> = {}): AgentNdiStreamReportDto =>
    ({ streamId, state: 'streaming', framesDropped: 2, ...overrides }) as AgentNdiStreamReportDto;

  beforeEach(() => {
    service = new NdiStreamStatusService();
  });

  it('stores the latest status with nulls for omitted fields', () => {
    service.record('agent-1', [report()]);
    service.record('agent-1', [report({ state: 'error', error: 'lost source', fps: 12 })]);

    expect(service.get(streamId, 'agent-1')).toEqual(
      expect.objectContaining({
        state: 'error',
        error: 'lost source',
        fps: 12,
        sourceName: null,
        encoder: null,
        uploadLagMs: null,
        framesDropped: 2,
      }),
    );
  });

  it('only returns what the bound agent reported', () => {
    service.record('intruder', [report()]);

    expect(service.get(streamId, 'agent-1')).toBeUndefined();
    expect(service.get(streamId, null)).toBeUndefined();
  });

  it('clears a status, and ignores a missing agent', () => {
    service.record('agent-1', [report()]);
    service.clear(streamId, null);
    expect(service.get(streamId, 'agent-1')).toBeDefined();

    service.clear(streamId, 'agent-1');
    expect(service.get(streamId, 'agent-1')).toBeUndefined();
  });

  it('stops accepting new streams once the cap is reached, but keeps updating known ones', () => {
    const ids = Array.from(
      { length: 2001 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    );
    service.record(
      'agent-1',
      ids.map((id) => report({ streamId: id })),
    );

    expect(service.get(ids[1999], 'agent-1')).toBeDefined();
    expect(service.get(ids[2000], 'agent-1')).toBeUndefined();

    service.record('agent-1', [report({ streamId: ids[0], state: 'connecting' })]);
    expect(service.get(ids[0], 'agent-1')?.state).toBe('connecting');
  });

  describe('expiry', () => {
    const t0 = 1_000_000;

    it('serves a status up to the TTL and treats an older one as absent', () => {
      service.record('agent-1', [report()], t0);

      expect(service.get(streamId, 'agent-1', t0 + NDI_STATUS_TTL_MS)).toBeDefined();
      expect(service.get(streamId, 'agent-1', t0 + NDI_STATUS_TTL_MS + 1)).toBeUndefined();
    });

    it('evicts stale entries on the next record, freeing room under the cap', () => {
      const ids = Array.from(
        { length: 2000 },
        (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      );
      service.record(
        'agent-1',
        ids.map((id) => report({ streamId: id })),
        t0,
      );
      const fresh = '11111111-1111-4111-8111-111111111111';

      service.record('agent-1', [report({ streamId: fresh })], t0 + NDI_STATUS_TTL_MS + 1);

      expect(service.get(fresh, 'agent-1', t0 + NDI_STATUS_TTL_MS + 1)).toBeDefined();
      expect(service.get(ids[0], 'agent-1', t0 + NDI_STATUS_TTL_MS + 1)).toBeUndefined();
    });
  });
});
