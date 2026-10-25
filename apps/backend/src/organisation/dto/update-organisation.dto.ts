import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { IsTimeZone } from '../../common/time-zone.validators';

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsTimeZone()
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
