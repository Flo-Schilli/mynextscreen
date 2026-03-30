import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateScheduleEntryDto {
  @IsNotEmpty()
  @IsUUID()
  screenId!: string;

  @IsNotEmpty()
  @IsUUID()
  playlistId!: string;

  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @IsNotEmpty()
  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  rrule?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'colour must be a hex colour (e.g. #FF5733)',
  })
  colour!: string;
}
