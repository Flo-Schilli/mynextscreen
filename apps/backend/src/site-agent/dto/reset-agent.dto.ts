import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetAgentDto {
  /**
   * A fresh setup code issued in the dashboard for this agent's organisation.
   *
   * Required so that resetting a running agent needs an authenticated dashboard
   * session, not merely reach to the agent's setup port on the venue LAN.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  setupCode!: string;
}
