import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SLIDE_FORMATS, type SlideFormat } from '../content-source.types';
import { SlideStyleDto } from './slide-style.dto';
import { SYNC_INTERVAL_MAX_MINUTES, SYNC_INTERVAL_MIN_MINUTES } from './create-content-source.dto';

/** The adapter type is fixed once a source exists; its events depend on it. */
export class UpdateContentSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(SLIDE_FORMATS, { each: true })
  formats?: SlideFormat[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SlideStyleDto)
  style?: SlideStyleDto;

  @IsOptional()
  @IsInt()
  @Min(SYNC_INTERVAL_MIN_MINUTES)
  @Max(SYNC_INTERVAL_MAX_MINUTES)
  syncIntervalMinutes?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
