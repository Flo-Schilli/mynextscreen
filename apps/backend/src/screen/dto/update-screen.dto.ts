import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateScreenDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}
