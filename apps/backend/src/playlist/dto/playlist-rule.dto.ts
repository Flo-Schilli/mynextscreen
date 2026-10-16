import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SLIDE_FORMATS, type SlideFormat } from '../../content-source/content-source.types';
import { TransitionType } from '../transition-type.enum';
import {
  GENRE_MATCH_MODES,
  RULE_SORT_ORDERS,
  type GenreMatchMode,
  type PlaylistRule,
  type RuleDateFrom,
  type RuleDateTo,
  type RuleSortOrder,
} from '../playlist-rule.types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RULE_SOURCES = 20;
const MAX_RULE_FILTER_VALUES = 50;
const MAX_FILTER_VALUE_LENGTH = 200;
const MAX_RELATIVE_DAYS = 730;

export const RULE_LIMIT_MAX = 200;
export const RULE_GRACE_HOURS_MAX = 24;
export const RULE_REFRESH_MIN_MINUTES = 5;
export const RULE_REFRESH_MAX_MINUTES = 1440;
export const RULE_ITEM_DURATION_MAX_SECONDS = 3600;
export const RULE_TRANSITION_DURATION_MAX_MS = 3000;

export const DEFAULT_RULE_LIMIT = 50;
export const DEFAULT_RULE_GRACE_HOURS = 4;
export const DEFAULT_RULE_REFRESH_MINUTES = 15;
export const DEFAULT_RULE_ITEM_DURATION_SECONDS = 10;
export const DEFAULT_RULE_TRANSITION_DURATION_MS = 500;

const DATE_FROM_MODES = ['today', 'fixed', 'relativeDays'] as const;
const DATE_TO_MODES = ['none', 'fixed', 'relativeDays'] as const;

export class RuleGenresDto {
  @IsIn(GENRE_MATCH_MODES)
  match: GenreMatchMode = 'any';

  @IsArray()
  @ArrayMaxSize(MAX_RULE_FILTER_VALUES)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(MAX_FILTER_VALUE_LENGTH, { each: true })
  values: string[] = [];
}

/** `date` is required for `fixed`, `days` for `relativeDays`; the other mode ignores both. */
export class RuleDateFromDto {
  @IsIn(DATE_FROM_MODES)
  mode!: RuleDateFrom['mode'];

  @ValidateIf((dto: RuleDateFromDto) => dto.mode === 'fixed')
  @Matches(ISO_DATE, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ValidateIf((dto: RuleDateFromDto) => dto.mode === 'relativeDays')
  @IsInt()
  @Min(0)
  @Max(MAX_RELATIVE_DAYS)
  days?: number;
}

export class RuleDateToDto {
  @IsIn(DATE_TO_MODES)
  mode!: RuleDateTo['mode'];

  @ValidateIf((dto: RuleDateToDto) => dto.mode === 'fixed')
  @Matches(ISO_DATE, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ValidateIf((dto: RuleDateToDto) => dto.mode === 'relativeDays')
  @IsInt()
  @Min(0)
  @Max(MAX_RELATIVE_DAYS)
  days?: number;
}

/**
 * Filter rule of a dynamic playlist. Everything but `sourceIds` and `format`
 * has a default (an explicit `null` is rejected), so a minimal rule is "all upcoming events of these sources".
 */
export class PlaylistRuleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RULE_SOURCES)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  sourceIds!: string[];

  @ValidateNested()
  @Type(() => RuleGenresDto)
  genres: RuleGenresDto = new RuleGenresDto();

  @IsArray()
  @ArrayMaxSize(MAX_RULE_FILTER_VALUES)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(MAX_FILTER_VALUE_LENGTH, { each: true })
  venues: string[] = [];

  @ValidateNested()
  @Type(() => RuleDateFromDto)
  dateFrom: RuleDateFromDto = Object.assign(new RuleDateFromDto(), { mode: 'today' });

  @ValidateNested()
  @Type(() => RuleDateToDto)
  dateTo: RuleDateToDto = Object.assign(new RuleDateToDto(), { mode: 'none' });

  @IsBoolean()
  excludeCancelled = true;

  @IsBoolean()
  excludeSoldOut = false;

  @IsIn(RULE_SORT_ORDERS)
  sort: RuleSortOrder = 'date_asc';

  @IsInt()
  @Min(1)
  @Max(RULE_LIMIT_MAX)
  limit = DEFAULT_RULE_LIMIT;

  @IsInt()
  @Min(0)
  @Max(RULE_GRACE_HOURS_MAX)
  graceHours = DEFAULT_RULE_GRACE_HOURS;

  @IsInt()
  @Min(RULE_REFRESH_MIN_MINUTES)
  @Max(RULE_REFRESH_MAX_MINUTES)
  refreshIntervalMinutes = DEFAULT_RULE_REFRESH_MINUTES;

  @IsIn(SLIDE_FORMATS)
  format!: SlideFormat;

  @IsInt()
  @Min(1)
  @Max(RULE_ITEM_DURATION_MAX_SECONDS)
  itemDurationSeconds = DEFAULT_RULE_ITEM_DURATION_SECONDS;

  @IsEnum(TransitionType)
  transition: TransitionType = TransitionType.Fade;

  @IsInt()
  @Min(0)
  @Max(RULE_TRANSITION_DURATION_MAX_MS)
  transitionDurationMs = DEFAULT_RULE_TRANSITION_DURATION_MS;
}

function toDateFrom(dto: RuleDateFromDto): RuleDateFrom {
  if (dto.mode === 'fixed') return { mode: 'fixed', date: dto.date! };
  if (dto.mode === 'relativeDays') return { mode: 'relativeDays', days: dto.days! };
  return { mode: 'today' };
}

function toDateTo(dto: RuleDateToDto): RuleDateTo {
  if (dto.mode === 'fixed') return { mode: 'fixed', date: dto.date! };
  if (dto.mode === 'relativeDays') return { mode: 'relativeDays', days: dto.days! };
  return { mode: 'none' };
}

/** Plain, normalised rule for storage: no class instances, no fields of other date modes. */
export function toPlaylistRule(dto: PlaylistRuleDto): PlaylistRule {
  return {
    sourceIds: [...dto.sourceIds],
    genres: { match: dto.genres.match, values: [...dto.genres.values] },
    venues: [...dto.venues],
    dateFrom: toDateFrom(dto.dateFrom),
    dateTo: toDateTo(dto.dateTo),
    excludeCancelled: dto.excludeCancelled,
    excludeSoldOut: dto.excludeSoldOut,
    sort: dto.sort,
    limit: dto.limit,
    graceHours: dto.graceHours,
    refreshIntervalMinutes: dto.refreshIntervalMinutes,
    format: dto.format,
    itemDurationSeconds: dto.itemDurationSeconds,
    transition: dto.transition,
    transitionDurationMs: dto.transitionDurationMs,
  };
}
