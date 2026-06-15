import { IsString, IsOptional, IsDateString, IsNotEmpty, IsUUID, Matches } from 'class-validator';

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
