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
  const fromStep =
    pendingStep !== null &&
    pendingStep >= 0 &&
    pendingStep < advertiserTourSteps.length
      ? pendingStep
      : 0;

  if (pendingStep !== null && pendingStep !== fromStep) {
    onboardingState.clearPendingStep();
  }

  const step = advertiserTourSteps[fromStep];

  // If this step requires a different page, navigate there first.
  // The pending step stays in localStorage so the destination page resumes it.
  // Also accept /advertiser/<route> aliases (e.g. /overview ≡ /advertiser/overview).
  if (step?.route) {
    const currentPath = window.location.pathname;
    const onCorrectPage =
      currentPath.startsWith(step.route) ||
      currentPath.startsWith('/advertiser' + step.route);
    if (!onCorrectPage) {
      navigateTo(step.route);
      return;
    }
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
