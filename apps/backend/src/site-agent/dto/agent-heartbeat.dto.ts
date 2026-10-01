import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AgentHeartbeatDto {
  /**
   * Version the agent reports. Optional on purpose: an older agent that does
   * not send one must still be able to check in, exactly as with screens.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  agentVersion?: string;
}
