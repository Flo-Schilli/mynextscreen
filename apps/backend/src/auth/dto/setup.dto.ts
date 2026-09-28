import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** First-run setup: payload to create the initial system super-admin via the UI. */
export class SetupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  // bcrypt only reads the first 72 bytes; longer input is pure hashing cost.
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
