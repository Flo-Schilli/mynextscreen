import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePlaylistDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
}
