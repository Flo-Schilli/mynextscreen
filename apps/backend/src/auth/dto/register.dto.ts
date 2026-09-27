import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  // bcrypt only reads the first 72 bytes; longer input is pure hashing cost.
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  organisationName!: string;
}
