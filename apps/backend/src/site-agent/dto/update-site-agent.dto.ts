import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSiteAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;
}
