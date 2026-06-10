import { IsUUID, IsOptional } from 'class-validator';

export class SetDefaultPlaylistDto {
  @IsOptional()
  @IsUUID()
  playlistId?: string | null;
}
