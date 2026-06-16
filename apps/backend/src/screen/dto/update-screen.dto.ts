import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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

  /** Show the "Click to unmute" overlay on the player. */
  @IsOptional()
  @IsBoolean()
  showUnmuteButton?: boolean;

  /** Show the "Disconnect" button on the player. */
  @IsOptional()
  @IsBoolean()
  showDisconnectButton?: boolean;
}
