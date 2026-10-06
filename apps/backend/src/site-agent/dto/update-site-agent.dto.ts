import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Bounds of the agent-wide probe interval, in minutes. */
export const PROBE_INTERVAL_MIN_MINUTES = 1;
export const PROBE_INTERVAL_MAX_MINUTES = 10;

export class UpdateSiteAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsInt()
  @Min(PROBE_INTERVAL_MIN_MINUTES)
  @Max(PROBE_INTERVAL_MAX_MINUTES)
  probeIntervalMinutes?: number;
}
