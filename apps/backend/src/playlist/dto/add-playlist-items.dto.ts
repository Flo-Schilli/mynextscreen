import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransitionType } from '../transition-type.enum';

/** Same upper bound as the content library's bulk-add-to-playlist. */
export const MAX_ITEMS_PER_BULK_ADD = 200;

/** One item of a bulk add. No `position`: bulk adds always append. */
export class NewPlaylistItemDto {
  @IsUUID()
  contentId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsEnum(TransitionType)
  transition?: TransitionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  transitionDurationMs?: number;
}

export class AddPlaylistItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ITEMS_PER_BULK_ADD)
  @ValidateNested({ each: true })
  @Type(() => NewPlaylistItemDto)
  items!: NewPlaylistItemDto[];
}
