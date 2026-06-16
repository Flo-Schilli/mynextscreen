import { IsNumberString, Length } from 'class-validator';

export class RepairScreenDto {
  /** 6-digit pairing code shown on the re-opened player. */
  @IsNumberString()
  @Length(6, 6)
  pairingCode!: string;
}
