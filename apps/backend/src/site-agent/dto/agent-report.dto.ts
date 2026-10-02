import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScreenReachability } from '../screen-reachability.enum';
import { DevmodeKeyStatus } from '../devmode-key-status.enum';
import { SshStatus } from '../ssh-status.enum';
import { SsapStatus } from '../ssap-status.enum';
import { ONBOARDING_LAST_STEP } from '../site-agent-command.enum';

/**
 * One screen's worth of what the agent observed.
 *
 * Every field is optional because the agent reports what it actually learned
 * this round: a probe that found the TV unreachable has nothing to say about
 * SSH, and overwriting the previous SSH status with "unknown" would throw away
 * the one piece of information the operator needs.
 */
export class AgentScreenReportDto {
  @IsUUID()
  screenId!: string;

  /** Correlates with the command that triggered this, when there was one. */
  @IsOptional()
  @IsUUID()
  commandId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ONBOARDING_LAST_STEP)
  step?: number;

  @IsOptional()
  @IsEnum(ScreenReachability)
  reachability?: ScreenReachability;

  /**
   * Short plain text from the device, shown in the onboarding wizard
   * ("ECONNREFUSED on 192.168.1.50:9991"). Unlike the notification test
   * endpoints, this is not a network oracle: it describes a host the operator
   * typed in themselves, on their own LAN.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;

  @IsOptional()
  @IsEnum(DevmodeKeyStatus)
  keyStatus?: DevmodeKeyStatus;

  @IsOptional()
  @IsEnum(SshStatus)
  sshStatus?: SshStatus;

  @IsOptional()
  @IsEnum(SsapStatus)
  ssapStatus?: SsapStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sshHostKeyFingerprint?: string;

  @IsOptional()
  @IsBoolean()
  launched?: boolean;

  @IsOptional()
  @IsBoolean()
  woken?: boolean;

  @IsOptional()
  @IsBoolean()
  devmodeExtended?: boolean;

  @IsOptional()
  @IsBoolean()
  standby?: boolean;

  @IsOptional()
  @IsIn(['ok', 'failed'])
  installStatus?: 'ok' | 'failed';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  installedAppId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  installedAppVersion?: string;
}

/** Batched because an agent reports for every screen it looks after each round. */
export class AgentReportDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AgentScreenReportDto)
  screens!: AgentScreenReportDto[];
}
