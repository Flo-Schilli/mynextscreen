import { IsNotEmpty, IsString } from 'class-validator';

export class CreateScreenDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  resolution!: string;

  @IsNotEmpty()
  @IsString()
  location!: string;
}
