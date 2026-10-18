import { Matches } from 'class-validator';

/** The acceptance hash the admin saw: must equal what the agent currently reports. */
export class AcceptCaptureLicenseDto {
  @Matches(/^[0-9a-f]{64}$/)
  licenseSha256!: string;
}
