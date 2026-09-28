import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Optional on purpose: a player from before this field existed sends no body at
 * all, and must keep working. Its absence is the signal that a screen has not
 * been migrated yet.
 */
export class HeartbeatDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  playerVersion?: string;
}
