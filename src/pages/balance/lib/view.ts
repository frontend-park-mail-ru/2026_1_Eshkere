import { formatPrice } from 'shared/lib/format';
import { DEFAULT_PAYMENT_METHOD } from '../model/state';
import type {
  BalanceDashboardState,
  BalanceHistoryState,
  PaymentMethodOption,
  RecommendationRow,
} from '../model/types';
import {
  formatAmountWithSign,
  formatLongDate,
  getFilteredOperations,
} from './history';

function getAverageDailySpend(state: BalanceDashboardState): number {
  return Math.max(1, Math.round(state.monthlySpend / 30));
}

function getDaysLeft(state: BalanceDashboardState): number {
  return Math.max(
    1,
    Math.floor(state.balanceValue / getAverageDailySpend(state)),
  );
}

function getAutopayStatus(state: BalanceDashboardState): string {
  return state.autopayEnabled ? 'Настроено' : 'Выключено';
}

function getAutopayHeroLabel(state: BalanceDashboardState): string {
  return state.autopayEnabled ? 'Вкл' : 'Выкл';
}

function getAutopayNote(state: BalanceDashboardState): string {
  return state.autopayEnabled
    ? `Когда баланс опускается ниже ${formatPrice(state.autopayThreshold)}`
    : 'Автопополнение отключено';
}

function getRecommendations(state: BalanceDashboardState): RecommendationRow[] {
  const daysLeft = getDaysLeft(state);
  const items: RecommendationRow[] = [];

  if (daysLeft <= 14) {
    items.push({
      title: 'Пополнить счет заранее',
      description: 'Чтобы активные кампании не остановились в пиковый день.',
      actionKey: 'topup',
    });
  }

  if (!state.autopayEnabled) {
    items.push({
      title: 'Включить автоплатеж',
      description: 'Резервное пополнение снизит риск остановки открутки.',
      actionKey: 'autopay',
    });
  } else {
    items.push({
      title: 'Проверить лимит автоплатежа',
      description:
        'Текущий лимит должен покрывать минимум несколько дней расхода.',
      actionKey: 'autopay',
    });
  }

  if (items.length < 2) {
    items.push({
      title: 'Пополнить счет заранее',
      description:
        'Дополнительный запас упростит масштабирование активных кампаний.',
      actionKey: 'topup',
    });
  }

  return items.slice(0, 2);
}

function createOperationNode(operation: BalanceDashboardState['operations'][number]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'balance-table__row';

  const title = document.createElement('span');
  title.className = 'balance-table__operation';
  title.textContent = operation.title;

  const date = document.createElement('span');
  date.textContent = formatLongDate(operation.date);

  const amount = document.createElement('strong');
  amount.className = 'balance-table__amount';
  amount.textContent = formatAmountWithSign(operation.amount);

  const status = document.createElement('span');
  status.className = `balance-pill balance-pill--${operation.tone}`;
  status.textContent = operation.status;

  row.append(title, date, amount, status);
  return row;
}

function createHistoryLogNode(
  operation: BalanceDashboardState['operations'][number],
): HTMLElement {
  const row = document.createElement('article');
  row.className = 'balance-log__row';

  const main = document.createElement('div');
  main.className = 'balance-log__main';

  const title = document.createElement('strong');
  title.className = 'balance-log__title';
  title.textContent = operation.title;

  const details = document.createElement('p');
  details.className = 'balance-log__details';
  details.textContent = operation.details;

  const meta = document.createElement('span');
  meta.className = 'balance-log__meta';
  meta.textContent = formatLongDate(operation.date);

  main.append(title, details, meta);

  const side = document.createElement('div');
  side.className = 'balance-log__side';

  const amount = document.createElement('strong');
  amount.className = 'balance-log__amount';
  amount.textContent = formatAmountWithSign(operation.amount);

  const status = document.createElement('span');
  status.className = `balance-pill balance-pill--${operation.tone}`;
  status.textContent = operation.status;

  side.append(amount, status);
  row.append(main, side);
  return row;
}

function createEmptyHistoryNode(): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'balance-log__empty';
  empty.textContent = 'По текущему фильтру ничего не найдено.';
  return empty;
}

function createRecommendationNode(item: RecommendationRow): HTMLButtonElement {
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

function createPaymentMethodNode(
  method: PaymentMethodOption,
  selectedValue: string,
): HTMLElement {
  const label = document.createElement('label');
  label.className = 'balance-modal__method';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'method';
  input.value = method.value;
  input.checked = method.value === selectedValue;

  const ui = document.createElement('span');
  ui.className = 'balance-modal__method-ui';

  const main = document.createElement('span');
  main.className = 'balance-modal__method-main';

  const title = document.createElement('strong');
  title.className = 'balance-modal__method-title';
  title.textContent = method.value;

  const caption = document.createElement('span');
  caption.className = 'balance-modal__method-caption';
  caption.textContent = method.caption;

  const note = document.createElement('span');
  note.className = 'balance-modal__method-note';
  note.textContent = method.note;

  main.append(title, caption);
  ui.append(main, note);
  label.append(input, ui);
  return label;
}

export function renderOperations(state: BalanceDashboardState): void {
  const operationsBody = document.querySelector<HTMLElement>(
    '[data-balance-operations-body]',
  );
  if (!operationsBody) {
    return;
  }

  operationsBody.replaceChildren(
    ...state.operations.slice(0, 6).map((operation) => createOperationNode(operation)),
  );
}

export function renderRecommendations(state: BalanceDashboardState): void {
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

export function renderPaymentMethods(state: BalanceDashboardState): void {
  const methodsNode = document.querySelector<HTMLElement>(
    '[data-balance-payment-methods]',
  );
  if (!methodsNode) {
    return;
  }

  methodsNode.replaceChildren(
    ...state.paymentMethods.map((method) =>
      createPaymentMethodNode(method, state.paymentMethod),
    ),
  );
}

export function renderHistoryLog(
  state: BalanceDashboardState,
  historyState: BalanceHistoryState,
): void {
  const historyBody = document.querySelector<HTMLElement>(
    '[data-balance-history-body]',
  );
  const countNode = document.querySelector<HTMLElement>(
    '[data-balance-history-count]',
  );
  const lastDateNode = document.querySelector<HTMLElement>(
    '[data-balance-history-last-date]',
  );

  if (!historyBody) {
    return;
  }

  const visibleOperations = getFilteredOperations(
    state.operations,
    historyState.filter,
    historyState.query,
  );

  historyBody.replaceChildren(
    ...(visibleOperations.length
      ? visibleOperations.map((operation) => createHistoryLogNode(operation))
      : [createEmptyHistoryNode()]),
  );

  if (countNode) {
    countNode.textContent = String(visibleOperations.length);
  }

  if (lastDateNode) {
    lastDateNode.textContent = visibleOperations.length
      ? formatLongDate(visibleOperations[0].date)
      : '—';
  }
}

export function syncHistoryControls(
  historyState: BalanceHistoryState,
): void {
  document
    .querySelectorAll<HTMLElement>('[data-balance-history-filter]')
    .forEach((button) => {
      button.classList.toggle(
        'is-active',
        button.dataset.balanceHistoryFilter === historyState.filter,
      );
    });

  const searchInput = document.querySelector<HTMLInputElement>(
    '[data-balance-history-search]',
  );
  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = historyState.query;
  }
}

function setText(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
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

export function syncBalanceView(
  state: BalanceDashboardState,
  historyState: BalanceHistoryState,
): void {
  setText('[data-balance-stat="balance"]', formatPrice(state.balanceValue));
  setText('[data-balance-stat="reserve"]', formatPrice(state.moderationReserve));
  setText('[data-balance-stat="monthlySpend"]', formatPrice(state.monthlySpend));
  setText('[data-balance-stat="autopay"]', getAutopayHeroLabel(state));
  setText('[data-balance-payment-method]', state.paymentMethod);
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

  const thresholdInput = document.querySelector<HTMLInputElement>(
    '#balance-autopay-form input[name="threshold"]',
  );
  const limitInput = document.querySelector<HTMLInputElement>(
    '#balance-autopay-form input[name="limit"]',
  );
  const enabledInput = document.querySelector<HTMLInputElement>(
    '#balance-autopay-form input[name="enabled"]',
  );

  if (thresholdInput && document.activeElement !== thresholdInput) {
    thresholdInput.value = String(state.autopayThreshold);
  }

  if (limitInput && document.activeElement !== limitInput) {
    limitInput.value = String(state.autopayLimit);
  }

  if (enabledInput) {
    enabledInput.checked = state.autopayEnabled;
  }

  syncQuickAmounts(state);
  renderOperations(state);
  renderRecommendations(state);
  renderPaymentMethods(state);
  syncHistoryControls(historyState);
  renderHistoryLog(state, historyState);

  const paymentInputs = document.querySelectorAll<HTMLInputElement>(
    '#balance-payment-form input[name="method"]',
  );

  if (!paymentInputs.length) {
    return;
  }

  let hasMatch = false;

  paymentInputs.forEach((input) => {
    const isCurrent = input.value === state.paymentMethod;
    input.checked = isCurrent;
    hasMatch = hasMatch || isCurrent;
  });

  if (!hasMatch) {
    const fallback =
      [...paymentInputs].find(
        (input) => input.value === DEFAULT_PAYMENT_METHOD,
      ) ?? paymentInputs[0];

    if (fallback) {
      fallback.checked = true;
    }
  }
}
