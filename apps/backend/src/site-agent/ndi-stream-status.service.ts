import { Injectable } from '@nestjs/common';
import type { AgentNdiStreamReportDto } from './dto/agent-report.dto';

export interface NdiStreamStatus {
  state: 'connecting' | 'streaming' | 'error';
  sourceName: string | null;
  encoder: string | null;
  fps: number | null;
  framesDropped: number;
  uploadLagMs: number | null;
  error: string | null;
  reportedAt: string;
}

/** Hard cap, defense in depth: the caller already filters to bound, active streams. */
const MAX_ENTRIES = 2000;

/**
 * A status older than this is treated as absent. The agent reports every 10 s
 * while it has NDI streams, so 30 s means it stopped or lost its connection.
 */
export const NDI_STATUS_TTL_MS = 30_000;

interface StoredStatus {
  status: NdiStreamStatus;
  reportedAtMs: number;
}

const keyOf = (agentId: string, streamId: string): string => `${agentId}/${streamId}`;

/**
 * Latest pipeline status per NDI stream, as reported by the agent.
 *
 * In memory on purpose: it is live telemetry the agent resends every few
 * seconds, so losing it on restart costs one interval. Entries are keyed by
 * agent and stream, and expire after {@link NDI_STATUS_TTL_MS}. The caller
 * passes only reports for streams that are active, NDI and bound to the
 * reporting agent.
 */
@Injectable()
export class NdiStreamStatusService {
  private readonly statuses = new Map<string, StoredStatus>();

  record(agentId: string, reports: readonly AgentNdiStreamReportDto[], now = Date.now()): void {
    this.evictStale(now);
    const reportedAt = new Date(now).toISOString();
    for (const report of reports) {
      const key = keyOf(agentId, report.streamId);
      if (!this.statuses.has(key) && this.statuses.size >= MAX_ENTRIES) {
        continue;
      }
      this.statuses.set(key, {
        reportedAtMs: now,
        status: {
          state: report.state,
          sourceName: report.sourceName ?? null,
          encoder: report.encoder ?? null,
          fps: report.fps ?? null,
          framesDropped: report.framesDropped,
          uploadLagMs: report.uploadLagMs ?? null,
          error: report.error ?? null,
          reportedAt,
        },
      });
    }
  }

  /** Status of a stream as reported by the agent it is bound to, if still fresh. */
  get(streamId: string, agentId: string | null, now = Date.now()): NdiStreamStatus | undefined {
    if (!agentId) {
      return undefined;
    }
    const key = keyOf(agentId, streamId);
    const stored = this.statuses.get(key);
    if (!stored) {
      return undefined;
    }
    if (now - stored.reportedAtMs > NDI_STATUS_TTL_MS) {
      this.statuses.delete(key);
      return undefined;
    }
    return stored.status;
  }

  clear(streamId: string, agentId: string | null): void {
    if (agentId) {
      this.statuses.delete(keyOf(agentId, streamId));
    }
  }

  private evictStale(now: number): void {
    for (const [key, stored] of this.statuses) {
      if (now - stored.reportedAtMs > NDI_STATUS_TTL_MS) {
        this.statuses.delete(key);
      }
    }
  }
}
