import { Injectable } from '@nestjs/common';
import type { AgentCapturePluginReportDto, CapturePluginAcceptedVia } from './dto/agent-report.dto';

export interface CapturePluginStatus {
  state: NonNullable<AgentCapturePluginReportDto['state']>;
  pluginVersion: string | null;
  apiVersion: string | null;
  sdkVersion: string | null;
  license: {
    licenseSha256: string;
    ndiLicenseSha256: string;
    termsSha256: string;
  } | null;
  errorCode: string | null;
  acceptedVia: CapturePluginAcceptedVia | null;
  reportedAt: string;
}

/** Hard cap, defense in depth: one entry per enrolled agent at most. */
const MAX_ENTRIES = 2000;

/**
 * A status older than this is treated as absent. The agent reports every 10 s
 * while the plugin answers, so 30 s means the plugin or the agent stopped.
 */
export const CAPTURE_PLUGIN_STATUS_TTL_MS = 30_000;

interface StoredStatus {
  status: CapturePluginStatus;
  reportedAtMs: number;
}

/**
 * Latest capture plugin status per site agent, as reported by the agent.
 *
 * In memory on purpose, like {@link NdiStreamStatusService}: live telemetry the
 * agent resends every few seconds, so losing it on restart costs one interval.
 * The license acceptance flow reads it to know which texts an agent's plugin
 * ships.
 */
@Injectable()
export class CapturePluginStatusService {
  private readonly statuses = new Map<string, StoredStatus>();

  record(agentId: string, report: AgentCapturePluginReportDto, now = Date.now()): void {
    this.evictStale(now);
    if (!this.statuses.has(agentId) && this.statuses.size >= MAX_ENTRIES) {
      return;
    }
    this.statuses.set(agentId, {
      reportedAtMs: now,
      status: {
        state: report.state,
        pluginVersion: report.pluginVersion ?? null,
        apiVersion: report.apiVersion ?? null,
        sdkVersion: report.sdkVersion ?? null,
        license: report.license
          ? {
              licenseSha256: report.license.licenseSha256,
              ndiLicenseSha256: report.license.ndiLicenseSha256,
              termsSha256: report.license.termsSha256,
            }
          : null,
        errorCode: report.errorCode ?? null,
        acceptedVia: report.acceptedVia ?? null,
        reportedAt: new Date(now).toISOString(),
      },
    });
  }

  /** Status as reported by the agent, if still fresh. */
  get(agentId: string, now = Date.now()): CapturePluginStatus | undefined {
    const stored = this.statuses.get(agentId);
    if (!stored) {
      return undefined;
    }
    if (now - stored.reportedAtMs > CAPTURE_PLUGIN_STATUS_TTL_MS) {
      this.statuses.delete(agentId);
      return undefined;
    }
    return stored.status;
  }

  clear(agentId: string): void {
    this.statuses.delete(agentId);
  }

  private evictStale(now: number): void {
    for (const [key, stored] of this.statuses) {
      if (now - stored.reportedAtMs > CAPTURE_PLUGIN_STATUS_TTL_MS) {
        this.statuses.delete(key);
      }
    }
  }
}
