import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class AddPlaylistItemDto {
  @IsNotEmpty()
  @IsString()
  contentId!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  durationSeconds!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
