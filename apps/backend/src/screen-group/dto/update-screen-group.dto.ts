import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ScreenGroupMode } from '../screen-group-mode.enum';

export class UpdateScreenGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(ScreenGroupMode)
  mode?: ScreenGroupMode;

  @ValidateIf((o) => o.mode === ScreenGroupMode.Split)
  @IsNotEmpty({ message: 'gridColumns is required when mode is split' })
  @IsInt()
  @Min(1)
  gridColumns?: number;

  @ValidateIf((o) => o.mode === ScreenGroupMode.Split)
  @IsNotEmpty({ message: 'gridRows is required when mode is split' })
  @IsInt()
  @Min(1)
  gridRows?: number;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6})$/, { message: 'color must be a 6-digit hex colour like #6d6cf6' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
