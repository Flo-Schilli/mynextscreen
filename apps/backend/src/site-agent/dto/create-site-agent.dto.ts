import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSiteAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  /** Free text, e.g. "Server room, Venue North". */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;
}
