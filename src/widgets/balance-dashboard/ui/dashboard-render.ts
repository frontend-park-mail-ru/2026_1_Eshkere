import { formatPrice } from 'shared/lib/format';
import type { BalanceDashboardState } from 'features/balance/model/types';
import {
  getAutopayHeroLabel,
  getAutopayNote,
  getAutopayStatus,
  getAverageDailySpend,
  getDaysLeft,
  getPaymentMethodLabel,
  getRecommendations,
} from './dashboard-metrics';

function createOperationNode(
  operation: BalanceDashboardState['operations'][number],
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'balance-table__row';

  const title = document.createElement('span');
  title.className = 'balance-table__operation';
  title.textContent = operation.title;

  const date = document.createElement('span');
  date.textContent = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(operation.date));

  const amount = document.createElement('strong');
  amount.className = 'balance-table__amount';
  amount.textContent = `${operation.amount >= 0 ? '+' : '−'}${formatPrice(
    Math.abs(operation.amount),
  )}`;

  const status = document.createElement('span');
  status.className = `balance-pill balance-pill--${operation.tone}`;
  status.textContent = operation.status;

  row.append(title, date, amount, status);
  return row;
}

function createEmptyOperationNode(): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'balance-table__empty';

  const image = document.createElement('img');
  image.className = 'balance-table__empty-image';
  image.src = '/img/No Results.png';
  image.alt = 'Операции не найдены';

  const title = document.createElement('strong');
  title.className = 'balance-table__empty-title';
  title.textContent = 'История операций пока пуста';

  const text = document.createElement('p');
  text.className = 'balance-table__empty-text';
  text.textContent = 'Здесь появятся пополнения, списания и возвраты по аккаунту.';

  empty.append(image, title, text);
  return empty;
}

function createRecommendationNode(
  item: ReturnType<typeof getRecommendations>[number],
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'balance-actions__item';
  button.type = 'button';
  button.dataset.balanceRecommendation = item.actionKey;

  const title = document.createElement('strong');
  title.className = 'balance-actions__title';
  title.textContent = item.title;

  const description = document.createElement('span');
  description.className = 'balance-actions__text';
  description.textContent = item.description;

  button.append(title, description);
  return button;
}

function setText(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

function renderOperations(state: BalanceDashboardState): void {
  const operationsBody = document.querySelector<HTMLElement>(
    '[data-balance-operations-body]',
  );
  if (!operationsBody) {
    return;
  }

  const visibleOperations = state.operations.slice(0, 6);

  operationsBody.replaceChildren(
    ...(visibleOperations.length
      ? visibleOperations.map((operation) => createOperationNode(operation))
      : [createEmptyOperationNode()]),
  );
}

function renderRecommendations(state: BalanceDashboardState): void {
  const recommendationsNode = document.querySelector<HTMLElement>(
    '[data-balance-recommendations]',
  );
  if (!recommendationsNode) {
    return;
  }

  recommendationsNode.replaceChildren(
    ...getRecommendations(state).map((item) => createRecommendationNode(item)),
  );
}

function syncQuickAmounts(state: BalanceDashboardState): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-amount]')
    .forEach((node) => {
      const amount = Number(node.dataset.balanceAmount || '0');
      node.classList.toggle(
        'balance-amount--active',
        amount === state.selectedAmount,
      );
    });

  document
    .querySelectorAll<HTMLElement>('[data-balance-modal-amount]')
    .forEach((node) => {
      const amount = Number(node.dataset.balanceModalAmount || '0');
      node.classList.toggle(
        'balance-modal__quick-button--active',
        amount === state.selectedAmount,
      );
    });
}

export function syncBalanceDashboardWidget(
  state: BalanceDashboardState,
): void {
  setText('[data-balance-stat="balance"]', formatPrice(state.balanceValue));
  setText('[data-balance-stat="reserve"]', formatPrice(state.moderationReserve));
  setText('[data-balance-stat="monthlySpend"]', formatPrice(state.monthlySpend));
  setText('[data-balance-stat="autopay"]', getAutopayHeroLabel(state));
  setText('[data-balance-payment-method]', getPaymentMethodLabel(state));
  setText('[data-balance-autopay-status]', getAutopayStatus(state));
  setText('[data-balance-autopay-note]', getAutopayNote(state));
  setText(
    '[data-balance-summary="dailySpend"]',
    formatPrice(getAverageDailySpend(state)),
  );
  setText('[data-balance-summary="daysLeft"]', `${getDaysLeft(state)} дней`);
  setText(
    '[data-balance-summary="autopayLimit"]',
    formatPrice(state.autopayLimit),
  );
  setText(
    '[data-balance-summary="vat"]',
    state.vatEnabled ? 'Включено' : 'Отключено',
  );
  setText('[data-balance-current-modal]', formatPrice(state.balanceValue));
  setText('[data-balance-topup-amount]', formatPrice(state.selectedAmount));
  setText(
    '[data-balance-next-balance]',
    formatPrice(state.balanceValue + state.selectedAmount),
  );
  setText('.navbar__balance', formatPrice(state.balanceValue));

  const topupInput = document.querySelector<HTMLInputElement>(
    '#balance-topup-form input[name="amount"]',
  );
  if (topupInput && document.activeElement !== topupInput) {
    topupInput.value = String(state.selectedAmount);
  }

  syncQuickAmounts(state);
  renderOperations(state);
  renderRecommendations(state);
}
