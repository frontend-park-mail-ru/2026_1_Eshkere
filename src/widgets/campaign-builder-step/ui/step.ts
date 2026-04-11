function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

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
    panel.hidden = panel.dataset.stepPanel !== step;
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
    progressFill.style.width = `${progressValue}%`;
  }
}
