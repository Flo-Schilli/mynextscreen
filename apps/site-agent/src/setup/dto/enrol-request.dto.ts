import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class SetupEnrolDto {
  /**
   * `require_tld: false` so an operator can point the agent at a server on the
   * venue's own network by hostname (`signage.lan`) or IP, which is a perfectly
   * ordinary on-premise deployment.
   */
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  serverUrl!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  enrolmentToken!: string;
}
