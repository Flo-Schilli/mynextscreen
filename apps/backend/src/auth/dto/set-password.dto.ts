import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(8)
  // bcrypt only reads the first 72 bytes; longer input is pure hashing cost.
  @MaxLength(72)
  newPassword!: string;

  /** Sent when an invitee activates their account; a password reset leaves the name alone. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}
