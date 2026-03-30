import { IsOptional, IsString } from 'class-validator';

export class UpdateScreenDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
