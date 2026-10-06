import { Transform } from 'class-transformer';
import { IsIn, IsIP, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export const AGENT_NETWORK_KINDS = ['ethernet', 'wifi', 'unknown'] as const;
export type AgentNetworkKind = (typeof AGENT_NETWORK_KINDS)[number];

/**
 * How the agent's machine is attached to the venue network, pushed on
 * heartbeat. Mirrors `AgentNetworkMessage` in the agent's server protocol.
 * Fields the agent could not read arrive as null.
 */
export class AgentNetworkDto {
  /** Linux interface names are at most 15 characters. */
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,14}$/)
  interfaceName!: string | null;

  @IsIn(AGENT_NETWORK_KINDS)
  kind!: AgentNetworkKind;

  /**
   * An SSID is at most 32 bytes; 64 characters leaves room for decoding.
   * Control characters are stripped rather than rejected: an access point
   * chooses its own name, and a hostile one must not knock the agent's
   * heartbeat out with it.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\p{Cc}/gu, '') || null : value,
  )
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(64)
  ssid!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsIP()
  ipAddress!: string | null;
}
