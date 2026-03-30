import {
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';

export class UpdateScheduleEntryDto {
  @IsOptional()
  @IsUUID()
  playlistId?: string;

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
