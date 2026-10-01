import { IsInt, Max, Min } from 'class-validator';
import { ONBOARDING_LAST_STEP } from '../site-agent-command.enum';

export class ScreenOnboardingCheckDto {
  /** Which wizard step to verify; see `OnboardingStep`. */
  @IsInt()
  @Min(1)
  @Max(ONBOARDING_LAST_STEP)
  step!: number;
}
