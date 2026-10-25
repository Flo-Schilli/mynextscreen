import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';
import { IsTimeZone } from '../../common/time-zone.validators';

export class CreateOrganisationDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsTimeZone()
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
