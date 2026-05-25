export { onboardingState } from './model/onboarding-state';
export { startTour, stop as stopTour } from './lib/tour-engine';
export { advertiserTourSteps } from './lib/tour-steps';

import { onboardingState } from './model/onboarding-state';
import { startTour } from './lib/tour-engine';
import { advertiserTourSteps } from './lib/tour-steps';
import { navigateTo } from 'shared/lib/navigation';

export function maybeStartAdvertiserTour(): void {
  if (onboardingState.isCompleted()) return;

  const pendingStep = onboardingState.getPendingStep();
  const fromStep = pendingStep ?? 0;

  const step = advertiserTourSteps[fromStep];

  // If this step requires a different page, navigate there first.
  // The pending step stays in localStorage so the destination page resumes it.
  if (step?.route && !window.location.pathname.startsWith(step.route)) {
    navigateTo(step.route);
    return;
  }

  onboardingState.clearPendingStep();

  startTour(
    advertiserTourSteps,
    fromStep,
    undefined,
    (route, stepIndex) => {
      onboardingState.savePendingStep(stepIndex);
      navigateTo(route);
    },
  );
}
