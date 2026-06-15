import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePlaylistDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6})$/, { message: 'color must be a 6-digit hex value (e.g. #6d6cf6)' })
  color?: string;
}
