import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { TransitionType } from '../transition-type.enum';

export class UpdatePlaylistItemDto {
  @IsOptional()
  @IsEnum(TransitionType)
  transition?: TransitionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  transitionDurationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;
}
