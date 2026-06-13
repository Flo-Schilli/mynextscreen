import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Self-service profile update. Currently only the display name is editable here;
 * email changes go through the verify-confirm flow (`/auth/change-email`) and
 * passwords through `/auth/change-password`. An empty/blank name clears it.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
