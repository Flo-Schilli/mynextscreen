import {
  IsBoolean,
  IsIn,
  IsInt,
  IsIP,
  IsMACAddress,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** The two ports LG's SSAP listens on: 3000 plain, 3001 TLS. */
export const SSAP_PORTS = [3000, 3001];

/**
 * Lower bound of the Developer Mode extension interval, in days.
 *
 * The upper bound is 40 rather than the session's own ~1000 hours (≈41.7 days)
 * because the extension can only run while the TV is on. A set that spends a
 * long weekend switched off would lose the session — and with it the installed
 * app — before the agent ever got a chance.
 */
export const DEVMODE_INTERVAL_MIN_DAYS = 1;
export const DEVMODE_INTERVAL_MAX_DAYS = 40;

export class UpdateScreenRemoteControlDto {
  /**
   * Which agent looks after this screen.
   *
   * No longer nullable. A null here used to detach the screen while keeping its
   * address, passphrase and onboarding progress, so the next agent inherited a
   * previous installation's values instead of the operator being walked through
   * the set in front of them. Taking a screen out is
   * `DELETE /api/screens/:id/remote-control`, which forgets all of it.
   */
  // Deliberately not `@IsOptional()`: that skips validation for null as well as
  // undefined, so a null would sail through and still half-remove the screen.
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  agentId?: string;

  /**
   * Address on the venue LAN. Not checked against `OutboundGuard`: the server
   * never dials this host, only the agent inside that network does.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIP()
  localIp?: string | null;

  /**
   * Needed for Wake-on-LAN. Note that a TV's wired and wireless interfaces have
   * different MACs — the one for the interface actually in use is the one that
   * works.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsMACAddress()
  macAddress?: string | null;

  /**
   * The six-character code from the Developer Mode app. An empty string means
   * "keep what is stored", matching how the SMTP password behaves — the client
   * can never read it back, so it has nothing to send again.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  devmodePassphrase?: string | null;

  @IsOptional()
  @IsInt()
  @IsIn(SSAP_PORTS)
  ssapPort?: number;

  @IsOptional()
  @IsBoolean()
  autoLaunchEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  extendDevmodeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(DEVMODE_INTERVAL_MIN_DAYS)
  @Max(DEVMODE_INTERVAL_MAX_DAYS)
  devmodeExtendIntervalDays?: number;

  @IsOptional()
  @IsBoolean()
  wakeBeforeScheduleEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  wakeLeadTimeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  wakeOnUnreachableEnabled?: boolean;
}
