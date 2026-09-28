import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(8)
  // bcrypt only reads the first 72 bytes; longer input is pure hashing cost.
  @MaxLength(72)
  newPassword!: string;
}
