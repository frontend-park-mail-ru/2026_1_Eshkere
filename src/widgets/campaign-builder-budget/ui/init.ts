import type { BuilderState } from 'features/campaign-builder/model/types';

interface InitCampaignBuilderBudgetControlsParams {
  formatBudgetPeriod: (days: number) => string;
  persistState: (state: BuilderState) => void;
  signal: AbortSignal;
  state: BuilderState;
  syncBuilder: (state: BuilderState) => void;
}

export function initCampaignBuilderBudgetControls({
  formatBudgetPeriod,
  persistState,
  signal,
  state,
  syncBuilder,
}: InitCampaignBuilderBudgetControlsParams): void {
  document
    .querySelectorAll<HTMLElement>('[data-builder-budget-preset]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const value = Number(button.dataset.builderBudgetPreset);

          if (!Number.isFinite(value)) {
            return;
          }

          state.dailyBudget = value;
          state.totalBudget = Math.max(state.totalBudget, value * 10);
          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-period-preset]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const value = button.dataset.builderPeriodPreset;

          if (!value) {
            return;
          }

          state.period = value;
          persistState(state);
          syncBuilder(state);
        },
        { signal },
      );
    });

  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-builder-budget]')
    .forEach((field) => {
      const update = (): void => {
        const key = field.dataset.builderBudget;
        if (!key) {
          return;
        }

        if (key === 'dailyBudget' || key === 'totalBudget') {
          const parsed = Number(field.value);
          state[key] = (Number.isFinite(parsed) ? parsed : 0) as never;
        } else if (key === 'periodDays') {
          const parsed = Number(field.value);
          const clamped = Math.max(
            1,
            Math.min(365, Number.isFinite(parsed) ? Math.round(parsed) : 14),
          );

          field.value = String(clamped);
          state.period = formatBudgetPeriod(clamped);
        } else if (key === 'strategy') {
          state.strategy = field.value as BuilderState['strategy'];
        }

        persistState(state);
        syncBuilder(state);
      };

      field.addEventListener('input', update, { signal });
      field.addEventListener('change', update, { signal });
    });
}
