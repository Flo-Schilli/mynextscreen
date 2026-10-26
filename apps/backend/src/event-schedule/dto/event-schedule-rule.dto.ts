import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Local wall-clock time, `HH:MM` from 00:00 to 23:59. */
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
/** Something other than whitespace: the name is stored trimmed. */
const NOT_BLANK = /\S/;
export const MAX_RULE_VENUES = 50;
export const MAX_RULE_TARGETS = 100;
export const MAX_GENRE_VARIANTS = 20;
export const MAX_VARIANT_GENRES = 30;

/** One genre group of a rule; see `GenreVariant`. */
export class GenreVariantDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_VARIANT_GENRES)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  genres!: string[];
}

export class CreateEventScheduleRuleDto {
  @IsString()
  @Matches(NOT_BLANK, { message: 'name must not be blank' })
  @MaxLength(80)
  name!: string;

  /** Canonical venue names. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RULE_VENUES)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  venues!: string[];

  @IsUUID()
  playlistId!: string;

  @Matches(HH_MM, { message: 'windowStart must be a time HH:MM' })
  windowStart!: string;

  /** At or before `windowStart` means the next day. */
  @Matches(HH_MM, { message: 'windowEnd must be a time HH:MM' })
  windowEnd!: string;

  @IsArray()
  @ArrayMaxSize(MAX_RULE_TARGETS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  screenIds!: string[];

  @IsArray()
  @ArrayMaxSize(MAX_RULE_TARGETS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  groupIds!: string[];

  @IsOptional()
  @IsBoolean()
  excludeCancelled?: boolean;

  /** Ordered; the first group sharing a genre with an event wins. Needs a dynamic playlist. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GENRE_VARIANTS)
  @ValidateNested({ each: true })
  @Type(() => GenreVariantDto)
  genreVariants?: GenreVariantDto[];

  @IsOptional()
  @Matches(HEX_COLOUR, { message: 'colour must be a hex colour (e.g. #FF5733)' })
  colour?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Every field optional; sending `screenIds` or `groupIds` replaces that target list. */
export class UpdateEventScheduleRuleDto {
  @IsOptional()
  @IsString()
  @Matches(NOT_BLANK, { message: 'name must not be blank' })
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RULE_VENUES)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  venues?: string[];

  @IsOptional()
  @IsUUID()
  playlistId?: string;

  @IsOptional()
  @Matches(HH_MM, { message: 'windowStart must be a time HH:MM' })
  windowStart?: string;

  @IsOptional()
  @Matches(HH_MM, { message: 'windowEnd must be a time HH:MM' })
  windowEnd?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RULE_TARGETS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  screenIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RULE_TARGETS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  groupIds?: string[];

  @IsOptional()
  @IsBoolean()
  excludeCancelled?: boolean;

  /** Ordered; the first group sharing a genre with an event wins. Needs a dynamic playlist. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GENRE_VARIANTS)
  @ValidateNested({ each: true })
  @Type(() => GenreVariantDto)
  genreVariants?: GenreVariantDto[];

  @IsOptional()
  @Matches(HEX_COLOUR, { message: 'colour must be a hex colour (e.g. #FF5733)' })
  colour?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
