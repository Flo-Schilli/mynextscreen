import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  // bcrypt only reads the first 72 bytes; longer input is pure hashing cost.
  @MaxLength(72)
  newPassword!: string;
}
