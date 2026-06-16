import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsUUID,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';
import type { SchedulePriority } from '../../db/schema';

export class CreateScheduleEntryDto {
  @IsOptional()
  @IsUUID()
  screenId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsNotEmpty()
  @IsUUID()
  playlistId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['normal', 'high'])
  priority?: SchedulePriority;

  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @IsNotEmpty()
  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  rrule?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'colour must be a hex colour (e.g. #FF5733)',
  })
  colour?: string;
}
