import { IsIn } from 'class-validator';
import { SiteAgentCommandType } from '../site-agent-command.enum';

/**
 * Commands an operator can trigger by hand from the dashboard.
 *
 * `reload_config` and `check` are deliberately not in this list: the first is
 * emitted by the server when settings change, the second belongs to the
 * onboarding endpoint, which also advances the step.
 */
export const MANUAL_COMMANDS = [
  SiteAgentCommandType.Launch,
  SiteAgentCommandType.Wake,
  SiteAgentCommandType.ExtendDevmode,
  SiteAgentCommandType.RefetchKey,
] as const;

export type ManualCommandType = (typeof MANUAL_COMMANDS)[number];

export class ScreenRemoteCommandDto {
  @IsIn(MANUAL_COMMANDS as readonly string[])
  type!: ManualCommandType;
}
