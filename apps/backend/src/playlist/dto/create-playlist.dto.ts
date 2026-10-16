import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PlaylistKind } from '../playlist-kind.enum';
import { PlaylistRuleDto } from './playlist-rule.dto';

export class CreatePlaylistDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6})$/, { message: 'color must be a 6-digit hex value (e.g. #6d6cf6)' })
  color?: string;

  /** Defaults to `static`. */
  @IsOptional()
  @IsEnum(PlaylistKind)
  kind?: PlaylistKind;

  /** Required for `dynamic`, rejected for `static` (checked by the service). */
  @ValidateIf((dto: CreatePlaylistDto) => dto.kind === PlaylistKind.Dynamic || dto.rule != null)
  @IsDefined()
  @ValidateNested()
  @Type(() => PlaylistRuleDto)
  rule?: PlaylistRuleDto;
}
