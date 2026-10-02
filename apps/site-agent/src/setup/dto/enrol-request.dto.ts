import { IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SetupEnrolDto {
  /**
   * Optional, because a deployment that pinned `MNS_SERVER_URL` decides the
   * address on its own and the form posts the field empty. Requiring it here
   * would reject that enrolment before the service can substitute the pinned
   * one — the page would be unusable in exactly the setup the pin is for.
   *
   * `require_tld: false` so an operator can point the agent at a server on the
   * venue's own network by hostname (`signage.lan`) or IP, which is a perfectly
   * ordinary on-premise deployment.
   */
  @ValidateIf((dto: SetupEnrolDto) => dto.serverUrl !== undefined && dto.serverUrl !== '')
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  serverUrl?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  enrolmentToken!: string;
}
