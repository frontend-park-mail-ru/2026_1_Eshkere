import type { BuilderState } from '../model/types';
import { STEP_META, STEP_ORDER } from '../model/config';

export function getStepProgress(state: BuilderState): {
  progressValue: number;
  progressLabel: string;
  currentStepTitle: string;
  currentStepText: string;
} {
  const currentIndex = STEP_ORDER.indexOf(state.step);
  const progressValue = Math.round(
    ((currentIndex + 1) / STEP_ORDER.length) * 100,
  );

  return {
    progressValue,
    progressLabel: `${progressValue}%`,
    currentStepTitle: STEP_META[state.step].title,
    currentStepText: STEP_META[state.step].text,
  };
}
