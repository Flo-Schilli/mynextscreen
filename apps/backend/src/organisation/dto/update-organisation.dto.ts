import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  storageOriginalLimitBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  storageTranscodedLimitBytes?: number;

  @IsOptional()
  @IsString()
  defaultPlaylistId?: string | null;
}
