import { markMotionUpdated } from 'shared/lib/animations';

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    const changed = node.textContent !== value;
    node.textContent = value;
    if (changed) {
      markMotionUpdated(node);
    }
  }
}

let lastStep: string | null = null;
let lastStepIndex: number | null = null;

interface SyncCampaignBuilderStepParams {
  canSubmit: boolean;
  currentIndex: number;
  currentStepText: string;
  currentStepTitle: string;
  lockedDescription: string;
  primaryActionLabel: string;
  progressLabel: string;
  progressValue: number;
  step: string;
}

export function syncCampaignBuilderStepView({
  canSubmit,
  currentIndex,
  currentStepText,
  currentStepTitle,
  lockedDescription,
  primaryActionLabel,
  progressLabel,
  progressValue,
  step,
}: SyncCampaignBuilderStepParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-step-trigger]')
    .forEach((button, index) => {
      const isActive = button.dataset.step === step;
      button.classList.toggle('campaign-builder__step--active', isActive);
      button.classList.toggle(
        'campaign-builder__step--complete',
        index < currentIndex,
      );

      const stateNode = button.querySelector<HTMLElement>(
        '.campaign-builder__step-state',
      );
      if (stateNode) {
        stateNode.textContent = isActive
          ? 'Сейчас'
          : index < currentIndex
            ? 'Готово'
            : 'Далее';
      }
    });

  document.querySelectorAll<HTMLElement>('[data-step-panel]').forEach((panel) => {
    const isActive = panel.dataset.stepPanel === step;
    const wasHidden = panel.hidden;
    panel.hidden = !isActive;

    if (isActive && (wasHidden || lastStep !== step)) {
      const direction = lastStepIndex !== null && currentIndex < lastStepIndex
        ? 'back'
        : 'forward';
      panel.dataset.motionDirection = direction;
      markMotionUpdated(panel, 'motion-step-enter', 420);
    }
  });

  document
    .querySelectorAll<HTMLButtonElement>('[data-builder-submit]')
    .forEach((button) => {
      button.classList.toggle('campaign-builder__button--locked', !canSubmit);
      button.setAttribute('aria-disabled', String(!canSubmit));
      button.title = canSubmit ? primaryActionLabel : lockedDescription;
    });

  setText('[data-builder-current-step]', currentStepTitle);
  setText('[data-builder-current-step-text]', currentStepText);
  setText('[data-builder-aside-step]', currentStepTitle);
  setText('[data-builder-progress-value]', progressLabel);

  const progressFill = document.querySelector<HTMLElement>(
    '[data-builder-progress-fill]',
  );
  if (progressFill) {
    const nextWidth = `${progressValue}%`;
    const changed = progressFill.style.width !== nextWidth;
    progressFill.style.width = nextWidth;
    if (changed) {
      markMotionUpdated(progressFill);
    }
  }

  lastStep = step;
  lastStepIndex = currentIndex;
}
