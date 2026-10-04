import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One supervised screen's runtime state, as reported by the agent on heartbeat.
 * Every field is required and bounded so a malformed push is rejected at the
 * boundary rather than poisoning a Prometheus series.
 */
export class AgentScreenMetricsDto {
  @IsString()
  @MaxLength(128)
  screenId!: string;

  @IsBoolean()
  reachable!: boolean;

  @IsInt()
  @Min(0)
  failures!: number;

  @IsBoolean()
  devmodeActive!: boolean;

  @IsInt()
  @Min(0)
  devmodeExtensions!: number;

  @IsInt()
  @Min(0)
  launches!: number;

  @IsInt()
  @Min(0)
  wakes!: number;
}

/**
 * Agent-level runtime metrics, pushed on the existing heartbeat so no new port
 * is opened in the venue network. Optional on the heartbeat DTO: an older agent
 * that omits it still checks in.
 */
export class AgentMetricsDto {
  @IsNumber()
  @Min(0)
  uptimeSeconds!: number;

  @IsNumber()
  @Min(0)
  memoryRssBytes!: number;

  @IsBoolean()
  connected!: boolean;

  @IsNumber()
  @Min(0)
  lastConfigPullAtMs!: number;

  @IsInt()
  @Min(0)
  screenCount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentScreenMetricsDto)
  screens!: AgentScreenMetricsDto[];
}
