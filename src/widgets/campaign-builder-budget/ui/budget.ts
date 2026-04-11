interface BudgetForecastView {
  clicks: string;
  cpc: string;
  note: string;
  reach: string;
}

interface BudgetInsightsView {
  paceLabel: string;
  paceNote: string;
  reserveLabel: string;
  reserveNote: string;
  warningTone: string;
  warnings: string[];
}

interface SyncCampaignBuilderBudgetParams {
  balanceBadge: string;
  balanceNote: string;
  balanceTitle: string;
  budget: BudgetForecastView;
  coverageDays: number;
  coverageRatio: number;
  dailyBudget: number;
  insights: BudgetInsightsView;
  period: string;
  periodSummary: string;
  periodTitle: string;
  plannedDays: number;
  strategyLabel: string;
  totalBudget: number;
  warningToneLabel: string;
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) {
    node.textContent = value;
  }
}

function setTextAll(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

export function syncCampaignBuilderBudgetView({
  balanceBadge,
  balanceNote,
  balanceTitle,
  budget,
  coverageDays,
  coverageRatio,
  dailyBudget,
  insights,
  period,
  periodSummary,
  periodTitle,
  plannedDays,
  strategyLabel,
  totalBudget,
  warningToneLabel,
}: SyncCampaignBuilderBudgetParams): void {
  setText('[data-budget-reach]', budget.reach);
  setText('[data-budget-clicks]', budget.clicks);
  setText('[data-budget-cpc]', budget.cpc);
  setText('[data-budget-note]', budget.note);
  setTextAll('[data-final-daily-budget]', `${dailyBudget.toLocaleString('ru-RU')} ₽`);
  setText('[data-final-total-budget]', `${totalBudget.toLocaleString('ru-RU')} ₽`);
  setTextAll('[data-final-period]', period);
  setTextAll('[data-final-strategy]', strategyLabel);
  setTextAll('[data-summary-reach]', budget.reach);
  setText('[data-budget-reach-aside]', budget.reach);
  setText('[data-budget-clicks-aside]', budget.clicks);
  setText('[data-builder-budget-total]', `${totalBudget.toLocaleString('ru-RU')} ₽`);
  setText('[data-builder-select-value="strategy"]', strategyLabel);
  setText('[data-budget-pace-label]', insights.paceLabel);
  setText('[data-budget-pace-note]', insights.paceNote);
  setText('[data-budget-reserve-label]', insights.reserveLabel);
  setText('[data-budget-reserve-note]', insights.reserveNote);
  setText('[data-budget-warning-tone]', warningToneLabel);
  setText(
    '[data-budget-preset-note]',
    `Дневной бюджет ${dailyBudget.toLocaleString('ru-RU')} ₽ при общем лимите ${totalBudget.toLocaleString('ru-RU')} ₽.`,
  );
  setText(
    '[data-budget-period-note]',
    `Выберите удобный горизонт запуска. Сейчас кампания запланирована на ${plannedDays} дн.`,
  );
  setText('[data-budget-period-label]', 'Горизонт запуска');
  setText('[data-budget-period-title]', periodTitle);
  setText('[data-budget-period-badge]', `${plannedDays} дн.`);
  setText('[data-budget-period-summary]', periodSummary);
  setText('[data-budget-balance-label]', 'Связка лимитов');
  setText('[data-budget-balance-title]', balanceTitle);
  setText('[data-budget-balance-badge]', balanceBadge);
  setText('[data-budget-balance-note]', balanceNote);

  document
    .querySelectorAll<HTMLInputElement>('[data-builder-budget="dailyBudget"]')
    .forEach((field) => {
      field.value = String(dailyBudget);
    });

  document
    .querySelectorAll<HTMLInputElement>('[data-builder-budget="totalBudget"]')
    .forEach((field) => {
      field.value = String(totalBudget);
    });

  document
    .querySelectorAll<HTMLInputElement>('[data-builder-budget="periodDays"]')
    .forEach((field) => {
      field.value = String(plannedDays);
    });

  document
    .querySelectorAll<HTMLElement>('[data-budget-warning-tone]')
    .forEach((node) => {
      node.classList.toggle(
        'campaign-builder__pill--danger',
        insights.warningTone === 'warning',
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-budget-balance-badge]')
    .forEach((node) => {
      node.classList.toggle(
        'campaign-builder__pill--danger',
        coverageDays < plannedDays,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-budget-balance-fill]')
    .forEach((node) => {
      node.style.width = `${Math.round(coverageRatio * 100)}%`;
    });

  document
    .querySelectorAll<HTMLElement>('[data-budget-warning-list]')
    .forEach((list) => {
      list.innerHTML = insights.warnings
        .map((item) => `<li class="campaign-builder__risk-item">${item}</li>`)
        .join('');
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-budget-preset]')
    .forEach((button) => {
      const value = Number(button.dataset.builderBudgetPreset);
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        Number.isFinite(value) && value === dailyBudget,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-builder-period-preset]')
    .forEach((button) => {
      button.classList.toggle(
        'campaign-builder__mini-chip--active',
        button.dataset.builderPeriodPreset === period,
      );
    });
}
