import { IsNotEmpty, IsString, IsInt, IsEnum, Min, Max, IsOptional } from 'class-validator';
import { TransitionType } from '../transition-type.enum';

export class AddPlaylistItemDto {
  @IsNotEmpty()
  @IsString()
  contentId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsEnum(TransitionType)
  transition?: TransitionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  transitionDurationMs?: number;
}
