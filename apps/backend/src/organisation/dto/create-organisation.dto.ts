import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateOrganisationDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  timeZone!: string;

  @IsInt()
  @Min(0)
  storageOriginalLimitBytes!: number;

  @IsInt()
  @Min(0)
  storageTranscodedLimitBytes!: number;

  @IsOptional()
  @IsString()
  defaultPlaylistId?: string | null;
}
