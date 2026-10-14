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

export const SYNC_INTERVAL_MIN_MINUTES = 15;
export const SYNC_INTERVAL_MAX_MINUTES = 10_080;

export class CreateContentSourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  /** Must name a registered adapter; checked by the service. */
  @IsString()
  @MaxLength(100)
  adapterType!: string;

  /** Validated by the adapter, whose schema varies per type. */
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(SLIDE_FORMATS, { each: true })
  formats!: SlideFormat[];

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
