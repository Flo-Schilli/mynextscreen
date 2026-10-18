import type { PtzCommand } from '../live-stream/ptz-command';
import type { SiteAgentCommandType } from './site-agent-command.enum';

interface SiteAgentCommandBase {
  commandId: string;
}

/**
 * Every command except `ptz`.
 *
 * `commandId` is what correlates the eventual report back to whoever asked —
 * the onboarding wizard in particular, which fires a check and then waits for
 * the answer to arrive on the dashboard's own SSE stream rather than holding an
 * HTTP request open.
 */
/** Command types that act on a screen or the whole agent. */
export type SiteAgentBasicCommandType = Exclude<SiteAgentCommandType, SiteAgentCommandType.Ptz>;

export interface SiteAgentBasicCommand extends SiteAgentCommandBase {
  type: SiteAgentBasicCommandType;
  /** Absent for agent-wide commands such as `reload_config` and `probe_now`. */
  screenId?: string;
  /** Only for `check`: which onboarding step to run. */
  step?: number;
}

/** Steers a camera; has no `screenId` and is handled before the agent's screen guard. */
export interface SiteAgentPtzCommand extends SiteAgentCommandBase {
  type: SiteAgentCommandType.Ptz;
  streamId: string;
  ptz: PtzCommand;
}

export type SiteAgentCommand = SiteAgentBasicCommand | SiteAgentPtzCommand;
