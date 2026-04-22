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

  if (
    settingsCard &&
    form &&
    !settingsCard.querySelector('[data-builder-budget-controls]')
  ) {
    form.insertAdjacentHTML(
      'beforeend',
      `
        <div class="campaign-builder__budget-controls" data-builder-budget-controls>
          <section class="campaign-builder__meta-item">
            <span class="campaign-builder__meta-item-label">Быстрый выбор дневного бюджета</span>
            <div class="campaign-builder__chip-row">
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="3000">3 000 ₽</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="5000">5 000 ₽</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="7500">7 500 ₽</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-budget-preset="12000">12 000 ₽</button>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-preset-note></p>
          </section>

          <section class="campaign-builder__meta-item">
            <span class="campaign-builder__meta-item-label">Период кампании</span>
            <div class="campaign-builder__chip-row">
              <button class="campaign-builder__mini-chip" type="button" data-builder-period-preset="7 дней">7 дней</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-period-preset="14 дней">14 дней</button>
              <button class="campaign-builder__mini-chip" type="button" data-builder-period-preset="30 дней">30 дней</button>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-period-note></p>
          </section>

          <section class="campaign-builder__meta-item campaign-builder__meta-item--period-preview">
            <div class="campaign-builder__budget-balance-head">
              <div class="campaign-builder__budget-balance-copy">
                <span class="campaign-builder__meta-item-label" data-budget-period-label>Горизонт запуска</span>
                <strong class="campaign-builder__meta-item-value" data-budget-period-title></strong>
              </div>
              <span class="campaign-builder__pill" data-budget-period-badge></span>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-period-summary></p>
          </section>

          <section class="campaign-builder__meta-item campaign-builder__meta-item--budget-link">
            <div class="campaign-builder__budget-balance-head">
              <div class="campaign-builder__budget-balance-copy">
                <span class="campaign-builder__meta-item-label" data-budget-balance-label>Связка лимитов</span>
                <strong class="campaign-builder__meta-item-value" data-budget-balance-title></strong>
              </div>
              <span class="campaign-builder__pill" data-budget-balance-badge></span>
            </div>
            <div class="campaign-builder__budget-balance-bar">
              <span data-budget-balance-fill></span>
            </div>
            <p class="campaign-builder__meta-item-text" data-budget-balance-note></p>
          </section>
        </div>
      `,
    );
  }

  if (forecastCard && !forecastCard.querySelector('[data-budget-pace-label]')) {
    forecastCard.innerHTML = `
      <div class="campaign-builder__card-head">
        <h2 class="campaign-builder__card-title">Прогноз бюджета</h2>
        <p class="campaign-builder__card-subtitle">Что даёт текущий бюджет и темп запуска.</p>
      </div>

      <div class="campaign-builder__metrics">
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Охват</span>
          <strong class="campaign-builder__metric-value" data-budget-reach></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Переходы</span>
          <strong class="campaign-builder__metric-value" data-budget-clicks></strong>
        </div>
        <div class="campaign-builder__metric">
          <span class="campaign-builder__metric-label">Средний CPC</span>
          <strong class="campaign-builder__metric-value" data-budget-cpc></strong>
        </div>
      </div>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">Темп расхода</strong>
          <span class="campaign-builder__pill" data-budget-pace-label></span>
        </div>
        <p class="campaign-builder__summary-block-text" data-budget-pace-note></p>
      </section>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">Запас по лимиту</strong>
          <span class="campaign-builder__pill" data-budget-reserve-label></span>
        </div>
        <p class="campaign-builder__summary-block-text" data-budget-reserve-note></p>
      </section>

      <section class="campaign-builder__summary-block">
        <div class="campaign-builder__summary-block-head">
          <strong class="campaign-builder__summary-block-title">На что обратить внимание</strong>
          <span class="campaign-builder__pill" data-budget-warning-tone></span>
        </div>
        <ul class="campaign-builder__risk-list" data-budget-warning-list></ul>
      </section>
    `;
  }
}
