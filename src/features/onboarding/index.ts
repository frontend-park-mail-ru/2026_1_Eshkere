export { onboardingState } from './model/onboarding-state';
export { startTour, stop as stopTour } from './lib/tour-engine';
export { advertiserTourSteps } from './lib/tour-steps';

import { onboardingState } from './model/onboarding-state';
import { startTour } from './lib/tour-engine';
import { advertiserTourSteps } from './lib/tour-steps';

export function maybeStartAdvertiserTour(): void {
  if (onboardingState.isCompleted()) return;
  startTour(advertiserTourSteps);
}
