import type { FinalReviewCheckKey, StepKey } from 'features/campaign-builder/model/types';

interface InitCampaignBuilderStepControlsParams {
  jumpToReviewSection: (key: FinalReviewCheckKey) => void;
  moveStep: (direction: 'next' | 'prev') => void;
  setStep: (step: StepKey) => void;
  signal: AbortSignal;
}

export function initCampaignBuilderStepControls({
  jumpToReviewSection,
  moveStep,
  setStep,
  signal,
}: InitCampaignBuilderStepControlsParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-step-trigger]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const step = button.dataset.step as StepKey | undefined;
          if (step) {
            setStep(step);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-step-action]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const direction = button.dataset.direction as
            | 'next'
            | 'prev'
            | undefined;
          if (direction) {
            moveStep(direction);
          }
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-review-jump]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const key = button.dataset.reviewJump as
            | FinalReviewCheckKey
            | undefined;
          if (key) {
            jumpToReviewSection(key);
          }
        },
        { signal },
      );
    });
}
