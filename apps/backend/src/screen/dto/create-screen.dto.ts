import { IsNotEmpty, IsNumberString, IsString, Length, MaxLength } from 'class-validator';

export class CreateScreenDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  resolution!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  location!: string;

  /** 6-digit pairing code shown on the player. */
  @IsNumberString()
  @Length(6, 6)
  pairingCode!: string;
}
