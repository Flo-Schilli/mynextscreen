import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LIST_FILTER_VALUES = 50;
export const MAX_EVENTS_PAGE = 500;
export const DEFAULT_EVENTS_PAGE = 200;

/** Accepts `?a=1&a=2` as well as `?a=1,2`. */
const toList = ({ value }: { value: unknown }): unknown => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : [entry]))
    .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
    .filter((entry) => entry !== '');
};

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Filters for the event pool of one source. */
export class SourceEventsQueryDto {
  /** Earliest event date, `YYYY-MM-DD`. */
  @IsOptional()
  @Matches(ISO_DATE)
  from?: string;

  /** Latest event date, `YYYY-MM-DD`. */
  @IsOptional()
  @Matches(ISO_DATE)
  to?: string;

  /** Exact venue names (any of). */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(MAX_LIST_FILTER_VALUES)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  venues?: string[];

  /** Genre labels (any of). */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(MAX_LIST_FILTER_VALUES)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  genres?: string[];

  /** Include events the source no longer lists. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeGone?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EVENTS_PAGE)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/** Restricts facet values to some sources; all of the organisation's when empty. */
export class SourceFacetsQueryDto {
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(MAX_LIST_FILTER_VALUES)
  @IsUUID('all', { each: true })
  sourceIds?: string[];
}
