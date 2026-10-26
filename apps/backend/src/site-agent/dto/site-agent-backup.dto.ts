import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  Max,
  Min,
  IsBase64,
  IsIn,
  IsInt,
  IsIP,
  IsMACAddress,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SSAP_PORTS } from './update-screen-remote-control.dto';

/**
 * Size of a backup file in base64. The agent refuses anything above 2 MiB raw,
 * which is ~2.7 MiB encoded; the routes that carry one get a body limit to
 * match (`BACKUP_BODY_LIMIT` in `site-agent-backup.constants.ts`).
 */
export const MAX_BACKUP_BASE64_LENGTH = 2_800_000;
/** A sealed 29-character password: 65-byte key, 12-byte IV, ciphertext, tag. */
const MAX_SEALED_LENGTH = 512;
/** A raw uncompressed P-256 point, base64. */
const PUBLIC_KEY_LENGTH = 88;
const MAX_ERROR_LENGTH = 500;
const MAX_SCREENS = 1000;

/** Dashboard → server: start an export and say whom to seal the password for. */
export class StartBackupExportDto {
  @IsBase64()
  @Length(PUBLIC_KEY_LENGTH, PUBLIC_KEY_LENGTH)
  recipientPublicKey!: string;
}

/** Dashboard → server: the file and the password, sealed for the agent. */
export class StageBackupImportDto {
  @IsUUID()
  sessionId!: string;

  @IsBase64()
  @MaxLength(MAX_BACKUP_BASE64_LENGTH)
  backup!: string;

  @IsBase64()
  @MaxLength(MAX_SEALED_LENGTH)
  sealedPassword!: string;
}

/** Agent → server: the finished export, or why there is none. */
export class AgentBackupExportDto {
  @IsOptional()
  @IsBase64()
  @MaxLength(MAX_BACKUP_BASE64_LENGTH)
  backup?: string;

  @IsOptional()
  @IsBase64()
  @MaxLength(MAX_SEALED_LENGTH)
  sealedPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ERROR_LENGTH)
  error?: string;
}

/** Agent → server: the import session's public key, or why there is none. */
export class AgentBackupImportKeyDto {
  @IsOptional()
  @IsBase64()
  @Length(PUBLIC_KEY_LENGTH, PUBLIC_KEY_LENGTH)
  publicKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ERROR_LENGTH)
  error?: string;
}

/**
 * One screen's settings from a backup. Validated with the same rules as a
 * dashboard edit, so a file cannot put anything into a row that the form
 * could not.
 */
export class AgentBackupScreenSettingsDto {
  @IsUUID()
  screenId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  devmodePassphrase?: string;

  @IsOptional()
  @IsIP()
  localIp?: string;

  @IsOptional()
  @IsMACAddress()
  macAddress?: string;

  @IsOptional()
  @IsInt()
  @IsIn(SSAP_PORTS)
  ssapPort?: number;

  /** Whether the agent restores a pairing key / SSH key for it; sets the onboarding start. */
  @IsOptional()
  @IsBoolean()
  hasSsapKey?: boolean;

  @IsOptional()
  @IsBoolean()
  hasDevmodeKey?: boolean;
}

/**
 * One entry of an opened backup, as the agent describes it for planning.
 * Deliberately without the passphrase: the plan waits in Redis while the
 * operator maps entries, and only sealed data or non-secrets belong there.
 */
export class AgentBackupAnalysisEntryDto {
  @IsUUID()
  screenId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}

export class AgentBackupAnalysisDto {
  @IsUUID()
  sourceAgentId!: string;

  @IsArray()
  @ArrayMaxSize(MAX_SCREENS)
  @ValidateNested({ each: true })
  @Type(() => AgentBackupAnalysisEntryDto)
  entries!: AgentBackupAnalysisEntryDto[];
}

export class BackupMappingDto {
  @IsUUID()
  from!: string;

  @IsUUID()
  to!: string;
}

/** Dashboard → server: where unknown entries go; anything unmapped is skipped. */
export class ApplyBackupImportDto {
  @IsArray()
  @ArrayMaxSize(MAX_SCREENS)
  @ValidateNested({ each: true })
  @Type(() => BackupMappingDto)
  mappings!: BackupMappingDto[];
}

export class AgentBackupRestoreDto {
  @IsUUID()
  sourceAgentId!: string;

  @IsArray()
  @ArrayMaxSize(MAX_SCREENS)
  @ValidateNested({ each: true })
  @Type(() => AgentBackupScreenSettingsDto)
  screens!: AgentBackupScreenSettingsDto[];
}

export class AgentBackupImportResultDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SCREENS)
  ssapRestored?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SCREENS)
  devmodeKeysRestored?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SCREENS)
  @IsUUID('all', { each: true })
  staleSsapScreenIds?: string[];

  // Validated whenever present, including an empty string: a result that
  // claims failure must say what failed.
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, MAX_ERROR_LENGTH)
  error?: string;
}
