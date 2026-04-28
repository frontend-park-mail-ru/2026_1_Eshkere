import { renderElement } from 'shared/lib/render';
import budgetControlsTemplate from '../ui/budget-controls.hbs';
import budgetForecastTemplate from '../ui/budget-forecast.hbs';
import type { BuilderState } from '../model/types';

export function ensureBudgetPanelScaffold(state: BuilderState): void {
  void state;

  const budgetPanel = document.querySelector<HTMLElement>('[data-step-panel="budget"]');

  if (!budgetPanel) {
    return;
  }

  const cards = budgetPanel.querySelectorAll<HTMLElement>('.campaign-builder__card');
  const settingsCard = cards[0];
  const forecastCard = cards[1];
  const form = settingsCard?.querySelector<HTMLElement>('.campaign-builder__form');

  if (settingsCard && form && !settingsCard.querySelector('[data-builder-budget-controls]')) {
    form.appendChild(renderElement(budgetControlsTemplate));
  }

  if (forecastCard && !forecastCard.querySelector('[data-budget-pace-label]')) {
    forecastCard.innerHTML = budgetForecastTemplate();
  }
}
