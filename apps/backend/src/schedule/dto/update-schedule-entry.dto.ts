import {
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';
import type { SchedulePriority } from '../../db/schema';

export class UpdateScheduleEntryDto {
  @IsOptional()
  @IsUUID()
  playlistId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  @IsOptional()
  @IsIn(['normal', 'high'])
  priority?: SchedulePriority;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  rrule?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'colour must be a hex colour (e.g. #FF5733)',
  })
  colour?: string;
}
