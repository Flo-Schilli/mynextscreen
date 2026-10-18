import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsIP,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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

  /**
   * The set's new address, found by its MAC after the old one stopped
   * answering. Only taken for a screen that has a MAC stored, because that is
   * the only way the agent could have found it.
   */
  @IsOptional()
  @IsIP(4)
  localIp?: string;

  /**
   * Seconds until the agent launches the app on a set it is holding back.
   * Relative because the venue machine's clock may be off; the server turns it
   * into a time with its own.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  appLaunchInSeconds?: number;
}

export const NDI_STREAM_STATES = ['connecting', 'streaming', 'error'] as const;
export type NdiStreamState = (typeof NDI_STREAM_STATES)[number];

/** Pipeline status of one NDI stream, as reported by the agent. */
export class AgentNdiStreamReportDto {
  @IsUUID()
  streamId!: string;

  @IsIn(NDI_STREAM_STATES)
  state!: NdiStreamState;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  encoder?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  fps?: number | null;

  @IsInt()
  @Min(0)
  framesDropped!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  uploadLagMs?: number | null;

  /** Short and free of secrets by contract; bounded anyway. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  error?: string | null;
}

export const CAPTURE_PLUGIN_STATES = [
  'license_required',
  'ready',
  'error',
  'incompatible',
  'absent',
] as const;
export type CapturePluginState = (typeof CAPTURE_PLUGIN_STATES)[number];

/** Reasons the plugin or the agent gives for `error` and `incompatible`. */
export const CAPTURE_PLUGIN_ERROR_CODES = [
  'unsupported_platform',
  'runtime_missing',
  'runtime_mismatch',
  'ndi_load_failed',
  'unsupported_api_version',
  'internal_error',
] as const;
export type CapturePluginErrorCode = (typeof CAPTURE_PLUGIN_ERROR_CODES)[number];

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Hashes of the exact license texts the plugin ships; what an acceptance must quote. */
export class AgentCapturePluginLicenseDto {
  @Matches(SHA256_HEX)
  licenseSha256!: string;

  @Matches(SHA256_HEX)
  ndiLicenseSha256!: string;

  @Matches(SHA256_HEX)
  termsSha256!: string;
}

/**
 * What the agent knows about the capture plugin (the separate NDI container).
 * Sent only while the plugin answers, so an agent without it omits the block.
 */
export class AgentCapturePluginReportDto {
  @IsIn(CAPTURE_PLUGIN_STATES)
  state!: CapturePluginState;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pluginVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  apiVersion?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d+){1,3}$/)
  sdkVersion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentCapturePluginLicenseDto)
  license?: AgentCapturePluginLicenseDto;

  @IsOptional()
  @IsIn(CAPTURE_PLUGIN_ERROR_CODES)
  errorCode?: CapturePluginErrorCode;
}

/** Batched because an agent reports for every screen it looks after each round. */
export class AgentReportDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AgentScreenReportDto)
  screens!: AgentScreenReportDto[];

  /** Optional: an agent without NDI streams omits it. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AgentNdiStreamReportDto)
  ndiStreams?: AgentNdiStreamReportDto[];

  /** Optional: an agent without the capture plugin omits it. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AgentCapturePluginReportDto)
  capturePlugin?: AgentCapturePluginReportDto;
}
