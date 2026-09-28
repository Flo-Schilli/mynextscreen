import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshScreenSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken!: string;
}
