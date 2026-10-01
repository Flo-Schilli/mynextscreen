import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnrolAgentDto {
  /** The one-time token shown in the dashboard when the agent was created. */
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  enrolmentToken!: string;
}
