import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** First-run setup: payload to create the initial system super-admin via the UI. */
export class SetupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
