import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { AgentMetricsDto } from './agent-metrics.dto';
import { AgentNetworkDto } from './agent-network.dto';

export class AgentHeartbeatDto {
  /**
   * Version the agent reports. Optional on purpose: an older agent that does
   * not send one must still be able to check in, exactly as with screens.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  agentVersion?: string;

  /**
   * Prometheus metrics the agent collected locally, pushed on the heartbeat so
   * no scrape port is opened in the venue network. Optional: an older agent that
   * omits it still checks in and simply has no mirrored series.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => AgentMetricsDto)
  metrics?: AgentMetricsDto;

  /**
   * How the machine is attached to the venue network, shown in the dashboard.
   * Optional: an older agent omits it and the last known values stay.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => AgentNetworkDto)
  network?: AgentNetworkDto;
}
