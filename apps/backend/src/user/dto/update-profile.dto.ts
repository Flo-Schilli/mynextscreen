import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Self-service profile update. The display name and the Gravatar opt-out are
 * editable here; email changes go through the verify-confirm flow
 * (`/auth/change-email`) and passwords through `/auth/change-password`. An
 * empty/blank name clears it. Each field is optional and applied independently.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  gravatarEnabled?: boolean;
}
