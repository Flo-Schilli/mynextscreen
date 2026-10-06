import type { SiteAgentCommandType } from './site-agent-command.enum';

/**
 * A single instruction pushed down an agent's SSE channel.
 *
 * `commandId` is what correlates the eventual report back to whoever asked —
 * the onboarding wizard in particular, which fires a check and then waits for
 * the answer to arrive on the dashboard's own SSE stream rather than holding an
 * HTTP request open.
 */
export interface SiteAgentCommand {
  commandId: string;
  type: SiteAgentCommandType;
  /** Absent for agent-wide commands such as `reload_config` and `probe_now`. */
  screenId?: string;
  /** Only for `check`: which onboarding step to run. */
  step?: number;
}
