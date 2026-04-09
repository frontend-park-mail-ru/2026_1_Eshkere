import './balance.scss';
import 'shared/ui/modal/modal';
import { renderTemplate } from 'shared/lib/render';
import { authState } from 'features/auth';
import { formatPrice } from 'shared/lib/format';
import balanceTemplate from './balance.hbs';

type BalanceOperationTone = 'success' | 'warning' | 'info' | 'muted';
type BalanceRecommendationAction = 'topup' | 'autopay';
type BalanceHistoryFilter = 'all' | 'topup' | 'charge' | 'refund';
type PaymentMethodKind = 'card' | 'corporate' | 'invoice';

interface BalanceOperation {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: string;
  tone: BalanceOperationTone;
  details: string;
}

interface PaymentMethodOption {
  id: string;
  kind: PaymentMethodKind;
  value: string;
  caption: string;
  note: string;
}

interface BalanceDashboardState {
  balanceValue: number;
  moderationReserve: number;
  monthlySpend: number;
  autopayEnabled: boolean;
  autopayThreshold: number;
  autopayLimit: number;
  paymentMethod: string;
  paymentMethods: PaymentMethodOption[];
  vatEnabled: boolean;
  selectedAmount: number;
  operations: BalanceOperation[];
}

interface RecommendationRow {
  title: string;
  description: string;
  actionKey: BalanceRecommendationAction;
}

const BALANCE_STORAGE_KEY = 'balance_dashboard_state';
const DEFAULT_PAYMENT_METHOD = 'Банковская карта •••• 4481';

function createDefaultPaymentMethods(): PaymentMethodOption[] {
  return [
    {
      id: 'payment_card_main',
      kind: 'card',
      value: 'Банковская карта •••• 4481',
      caption: 'Основной способ для ручных пополнений',
      note: 'Visa Business',
    },
    {
      id: 'payment_card_corp',
      kind: 'corporate',
      value: 'Корпоративная карта •••• 9024',
      caption: 'Резервный способ для пиковых пополнений',
      note: 'Mastercard',
    },
    {
      id: 'payment_invoice_main',
      kind: 'invoice',
      value: 'Безналичный счет компании',
      caption: 'Подходит для крупных пополнений по счету',
      note: 'Без НДС',
    },
  ];
}

let balancePageLifecycleController: AbortController | null = null;
let toastTimer: number | null = null;
let activeHistoryFilter: BalanceHistoryFilter = 'all';
let activeHistoryQuery = '';

function hasMojibake(value: string): boolean {
  const markers = ['Р‘', 'Р°', 'РЅ', 'Рє', 'СЂ', 'С‚', 'вЂ', '�'];
  return markers.some((marker) => value.includes(marker));
}

function sanitizePaymentMethod(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (!value || hasMojibake(value)) {
    return DEFAULT_PAYMENT_METHOD;
  }

  return value;
}

function getFallbackOperationTitle(item: Partial<BalanceOperation>, index: number): string {
  const id = typeof item.id === 'string' ? item.id : '';
  const amount = typeof item.amount === 'number' ? item.amount : 0;

  if (id.startsWith('topup_') || id.includes('topup') || amount > 0) {
    return 'Пополнение с карты';
  }

  if (id.includes('charge') || amount < 0) {
    return 'Списание на кампании';
  }

  if (id.includes('refund')) {
    return 'Возврат остатка';
  }

  const defaults = createDefaultOperations();
  return defaults[index]?.title ?? 'Операция';
}

function getFallbackOperationStatus(item: Partial<BalanceOperation>, index: number): string {
  const id = typeof item.id === 'string' ? item.id : '';
  const amount = typeof item.amount === 'number' ? item.amount : 0;

  if (id.startsWith('topup_') || id.includes('topup') || amount > 0) {
    return 'Успешно';
  }

  if (id.includes('charge') || amount < 0) {
    return 'Списано';
  }

  if (id.includes('refund')) {
    return 'Проверка';
  }

  const defaults = createDefaultOperations();
  return defaults[index]?.status ?? 'Проверка';
}

function sanitizeOperationTitle(item: Partial<BalanceOperation>, index: number): string {
  const value = typeof item.title === 'string' ? item.title.trim() : '';

  if (!value || hasMojibake(value)) {
    return getFallbackOperationTitle(item, index);
  }

  return value;
}

function sanitizeOperationStatus(item: Partial<BalanceOperation>, index: number): string {
  const value = typeof item.status === 'string' ? item.status.trim() : '';

  if (!value || hasMojibake(value)) {
    return getFallbackOperationStatus(item, index);
  }

  return value;
}

function sanitizeOperationDetails(item: Partial<BalanceOperation>, index: number): string {
  const value = typeof item.details === 'string' ? item.details.trim() : '';

  if (!value || hasMojibake(value)) {
    const defaults = createDefaultOperations();
    return defaults[index]?.details ?? 'Без дополнительного комментария';
  }

  return value;
}

function formatLongDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function createDefaultOperations(): BalanceOperation[] {
  return [
    {
      id: 'op_topup_default',
      title: 'Пополнение с карты',
      date: '2026-03-14T10:00:00.000Z',
      amount: 15000,
      status: 'Успешно',
      tone: 'success',
      details: 'Основная карта •••• 4481',
    },
    {
      id: 'op_charge_default',
      title: 'Списание на кампании',
      date: '2026-03-13T10:00:00.000Z',
      amount: -4800,
      status: 'Списано',
      tone: 'muted',
      details: 'Списано за активные кампании в аукционе',
    },
    {
      id: 'op_refund_default',
      title: 'Возврат остатка',
      date: '2026-03-11T10:00:00.000Z',
      amount: 1200,
      status: 'Проверка',
      tone: 'warning',
      details: 'Пересчет после завершения кампании',
    },
  ];
}

function getInitialState(): BalanceDashboardState {
  const currentUser = authState.getCurrentUser();
  const paymentMethods = createDefaultPaymentMethods();
  const paymentMethod = sanitizePaymentMethod(currentUser?.cardMasked);

  return {
    balanceValue: typeof currentUser?.balance === 'number' ? currentUser.balance : 48200,
    moderationReserve: 6000,
    monthlySpend: 124900,
    autopayEnabled: true,
    autopayThreshold: 5000,
    autopayLimit: 30000,
    paymentMethod: paymentMethods.some((item) => item.value === paymentMethod)
      ? paymentMethod
      : DEFAULT_PAYMENT_METHOD,
    paymentMethods,
    vatEnabled: true,
    selectedAmount: 10000,
    operations: createDefaultOperations(),
  };
}

function normalizeState(raw: unknown): BalanceDashboardState {
  const initial = getInitialState();

  if (!raw || typeof raw !== 'object') {
    return initial;
  }

  const data = raw as Partial<BalanceDashboardState>;
  const fallbackPaymentMethods = createDefaultPaymentMethods();
  const paymentMethods = Array.isArray(data.paymentMethods)
    ? data.paymentMethods
      .filter(Boolean)
      .map((item, index) => ({
        id: typeof item?.id === 'string' ? item.id : `payment_${index}`,
        kind: ['card', 'corporate', 'invoice'].includes(String(item?.kind))
          ? (item?.kind as PaymentMethodKind)
          : 'card',
        value: sanitizePaymentMethod(item?.value),
        caption:
          typeof item?.caption === 'string' && item.caption.trim() && !hasMojibake(item.caption)
            ? item.caption.trim()
            : fallbackPaymentMethods[index]?.caption ?? 'Способ оплаты для операций в кабинете',
        note:
          typeof item?.note === 'string' && item.note.trim() && !hasMojibake(item.note)
            ? item.note.trim()
            : fallbackPaymentMethods[index]?.note ?? 'Добавлено вручную',
      }))
    : fallbackPaymentMethods;
  const selectedPaymentMethod = sanitizePaymentMethod(data.paymentMethod);

  return {
    balanceValue: typeof data.balanceValue === 'number' ? data.balanceValue : initial.balanceValue,
    moderationReserve:
      typeof data.moderationReserve === 'number'
        ? data.moderationReserve
        : initial.moderationReserve,
    monthlySpend: typeof data.monthlySpend === 'number' ? data.monthlySpend : initial.monthlySpend,
    autopayEnabled:
      typeof data.autopayEnabled === 'boolean' ? data.autopayEnabled : initial.autopayEnabled,
    autopayThreshold:
      typeof data.autopayThreshold === 'number'
        ? data.autopayThreshold
        : initial.autopayThreshold,
    autopayLimit:
      typeof data.autopayLimit === 'number' ? data.autopayLimit : initial.autopayLimit,
    paymentMethod: paymentMethods.some((item) => item.value === selectedPaymentMethod)
      ? selectedPaymentMethod
      : paymentMethods[0]?.value ?? DEFAULT_PAYMENT_METHOD,
    paymentMethods,
    vatEnabled: typeof data.vatEnabled === 'boolean' ? data.vatEnabled : initial.vatEnabled,
    selectedAmount:
      typeof data.selectedAmount === 'number' && data.selectedAmount > 0
        ? data.selectedAmount
        : initial.selectedAmount,
    operations: Array.isArray(data.operations)
      ? data.operations.filter(Boolean).map((item, index) => ({
        id: typeof item?.id === 'string' ? item.id : `op_${index}`,
        title: sanitizeOperationTitle(item ?? {}, index),
        date: typeof item?.date === 'string' ? item.date : new Date().toISOString(),
        amount: typeof item?.amount === 'number' ? item.amount : 0,
        status: sanitizeOperationStatus(item ?? {}, index),
        tone: ['success', 'warning', 'info', 'muted'].includes(String(item?.tone))
          ? (item?.tone as BalanceOperationTone)
          : 'muted',
        details: sanitizeOperationDetails(item ?? {}, index),
      }))
      : initial.operations,
  };
}

function getBalanceState(): BalanceDashboardState {
  try {
    const stored = localStorage.getItem(BALANCE_STORAGE_KEY);
    return normalizeState(stored ? JSON.parse(stored) : null);
  } catch {
    return getInitialState();
  }
}

function persistBalanceState(state: BalanceDashboardState): void {
  localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(state));

  const currentUser = authState.getCurrentUser();
  if (!currentUser) {
    return;
  }

  authState.setAuthenticatedUser({
    ...currentUser,
    balance: state.balanceValue,
    cardMasked: state.paymentMethod,
  });
}

function getAverageDailySpend(state: BalanceDashboardState): number {
  return Math.max(1, Math.round(state.monthlySpend / 30));
}

function getDaysLeft(state: BalanceDashboardState): number {
  return Math.max(1, Math.floor(state.balanceValue / getAverageDailySpend(state)));
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

function formatAmountWithSign(value: number): string {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${formatPrice(Math.abs(value))}`;
}

function getOperationKind(operation: BalanceOperation): Exclude<BalanceHistoryFilter, 'all'> {
  if (operation.id.includes('refund') || operation.title.toLowerCase().includes('возврат')) {
    return 'refund';
  }

  if (operation.id.includes('charge') || operation.amount < 0) {
    return 'charge';
  }

  return 'topup';
}

function getFilteredOperations(
  operations: BalanceOperation[],
  filter: BalanceHistoryFilter,
  query: string,
): BalanceOperation[] {
  const normalizedQuery = query.trim().toLowerCase();

  return operations.filter((operation) => {
    const matchesFilter = filter === 'all' || getOperationKind(operation) === filter;

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      operation.title,
      operation.details,
      operation.status,
      formatLongDate(operation.date),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportOperationsToCsv(operations: BalanceOperation[]): void {
  const header = ['Операция', 'Дата', 'Сумма', 'Статус', 'Комментарий'];
  const rows = operations.map((operation) => [
    operation.title,
    formatLongDate(operation.date),
    formatAmountWithSign(operation.amount),
    operation.status,
    operation.details,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `balance-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
      description: 'Текущий лимит должен покрывать минимум несколько дней расхода.',
      actionKey: 'autopay',
    });
  }

  if (items.length < 2) {
    items.push({
      title: 'Пополнить счет заранее',
      description: 'Дополнительный запас упростит масштабирование активных кампаний.',
      actionKey: 'topup',
    });
  }

  return items.slice(0, 2);
}

function createOperationNode(operation: BalanceOperation): HTMLElement {
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

function createHistoryLogNode(operation: BalanceOperation): HTMLElement {
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

function createPaymentMethodNode(method: PaymentMethodOption, selectedValue: string): HTMLElement {
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

function renderOperations(state: BalanceDashboardState): void {
  const operationsBody = document.querySelector<HTMLElement>('[data-balance-operations-body]');
  if (!operationsBody) {
    return;
  }

  operationsBody.replaceChildren(
    ...state.operations.slice(0, 6).map((operation) => createOperationNode(operation)),
  );
}

function renderRecommendations(state: BalanceDashboardState): void {
  const recommendationsNode = document.querySelector<HTMLElement>('[data-balance-recommendations]');
  if (!recommendationsNode) {
    return;
  }

  recommendationsNode.replaceChildren(
    ...getRecommendations(state).map((item) => createRecommendationNode(item)),
  );
}

function renderPaymentMethods(state: BalanceDashboardState): void {
  const methodsNode = document.querySelector<HTMLElement>('[data-balance-payment-methods]');
  if (!methodsNode) {
    return;
  }

  methodsNode.replaceChildren(
    ...state.paymentMethods.map((method) => createPaymentMethodNode(method, state.paymentMethod)),
  );
}

function formatCardNumberInput(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function syncPaymentAddFormKind(form: HTMLFormElement): void {
  const kindInput = form.elements.namedItem('kind');
  const cardFields = form.querySelector<HTMLElement>('[data-balance-payment-card-fields]');
  const invoiceFields = form.querySelector<HTMLElement>('[data-balance-payment-invoice-fields]');
  const holderField = form.querySelector<HTMLElement>('[data-balance-payment-holder-field]');
  const aliasInput = form.querySelector<HTMLInputElement>('input[name="alias"]');

  const kind = kindInput instanceof HTMLInputElement
    ? (kindInput.value as PaymentMethodKind)
    : 'card';

  if (cardFields) {
    cardFields.hidden = kind === 'invoice';
  }

  if (invoiceFields) {
    invoiceFields.hidden = kind !== 'invoice';
  }

  if (holderField) {
    holderField.hidden = kind !== 'card';
  }

  if (aliasInput && document.activeElement !== aliasInput) {
    aliasInput.placeholder = kind === 'invoice'
      ? 'Например, Основной расчетный счет'
      : kind === 'corporate'
        ? 'Например, Карта команды маркетинга'
        : 'Например, Личная карта для пополнений';
  }
}

function closeBalanceSelect(select: HTMLElement): void {
  select.classList.remove('is-open');
  const trigger = select.querySelector<HTMLElement>('[data-balance-select-trigger]');
  const menu = select.querySelector<HTMLElement>('[data-balance-select-menu]');

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }

  if (menu) {
    menu.hidden = true;
  }
}

function openBalanceSelect(select: HTMLElement): void {
  document.querySelectorAll<HTMLElement>('[data-balance-select].is-open').forEach((node) => {
    if (node !== select) {
      closeBalanceSelect(node);
    }
  });

  select.classList.add('is-open');
  const trigger = select.querySelector<HTMLElement>('[data-balance-select-trigger]');
  const menu = select.querySelector<HTMLElement>('[data-balance-select-menu]');

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
  }

  if (menu) {
    menu.hidden = false;
  }
}

function syncBalanceSelectValue(select: HTMLElement, value: string, label: string): void {
  const key = select.dataset.balanceSelect;
  const valueNode = key
    ? select.querySelector<HTMLElement>(`[data-balance-select-value="${key}"]`)
    : null;
  const inputNode = key
    ? select.querySelector<HTMLInputElement>(`[data-balance-select-input="${key}"]`)
    : null;

  if (valueNode) {
    valueNode.textContent = label;
  }

  if (inputNode) {
    inputNode.value = value;
  }

  select.querySelectorAll<HTMLElement>('[data-balance-select-option]').forEach((option) => {
    const isActive = option.dataset.value === value;
    option.classList.toggle('balance-modal__select-option--active', isActive);
  });
}

function renderHistoryLog(state: BalanceDashboardState): void {
  const historyBody = document.querySelector<HTMLElement>('[data-balance-history-body]');
  const countNode = document.querySelector<HTMLElement>('[data-balance-history-count]');
  const lastDateNode = document.querySelector<HTMLElement>('[data-balance-history-last-date]');

  if (!historyBody) {
    return;
  }

  const visibleOperations = getFilteredOperations(
    state.operations,
    activeHistoryFilter,
    activeHistoryQuery,
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

function syncHistoryControls(): void {
  document.querySelectorAll<HTMLElement>('[data-balance-history-filter]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.balanceHistoryFilter === activeHistoryFilter);
  });

  const searchInput = document.querySelector<HTMLInputElement>('[data-balance-history-search]');
  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = activeHistoryQuery;
  }
}

function setText(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

function syncQuickAmounts(state: BalanceDashboardState): void {
  document.querySelectorAll<HTMLElement>('[data-balance-amount]').forEach((node) => {
    const amount = Number(node.dataset.balanceAmount || '0');
    node.classList.toggle('balance-amount--active', amount === state.selectedAmount);
  });

  document.querySelectorAll<HTMLElement>('[data-balance-modal-amount]').forEach((node) => {
    const amount = Number(node.dataset.balanceModalAmount || '0');
    node.classList.toggle('balance-modal__quick-button--active', amount === state.selectedAmount);
  });
}

function syncBalanceView(state: BalanceDashboardState): void {
  setText('[data-balance-stat="balance"]', formatPrice(state.balanceValue));
  setText('[data-balance-stat="reserve"]', formatPrice(state.moderationReserve));
  setText('[data-balance-stat="monthlySpend"]', formatPrice(state.monthlySpend));
  setText('[data-balance-stat="autopay"]', getAutopayHeroLabel(state));
  setText('[data-balance-payment-method]', state.paymentMethod);
  setText('[data-balance-autopay-status]', getAutopayStatus(state));
  setText('[data-balance-autopay-note]', getAutopayNote(state));
  setText('[data-balance-summary="dailySpend"]', formatPrice(getAverageDailySpend(state)));
  setText('[data-balance-summary="daysLeft"]', `${getDaysLeft(state)} дней`);
  setText('[data-balance-summary="autopayLimit"]', formatPrice(state.autopayLimit));
  setText('[data-balance-summary="vat"]', state.vatEnabled ? 'Включено' : 'Отключено');
  setText('[data-balance-current-modal]', formatPrice(state.balanceValue));
  setText('[data-balance-topup-amount]', formatPrice(state.selectedAmount));
  setText('[data-balance-next-balance]', formatPrice(state.balanceValue + state.selectedAmount));
  setText('.navbar__balance', formatPrice(state.balanceValue));

  const topupInput = document.querySelector<HTMLInputElement>('#balance-topup-form input[name="amount"]');
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
  const paymentInputs = document.querySelectorAll<HTMLInputElement>(
    '#balance-payment-form input[name="method"]',
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

  if (paymentInputs.length) {
    let hasMatch = false;

    paymentInputs.forEach((input) => {
      const isCurrent = input.value === state.paymentMethod;
      input.checked = isCurrent;
      hasMatch = hasMatch || isCurrent;
    });

    if (!hasMatch) {
      const fallback = [...paymentInputs].find((input) => input.value === DEFAULT_PAYMENT_METHOD)
        ?? paymentInputs[0];

      if (fallback) {
        fallback.checked = true;
      }
    }
  }

  syncQuickAmounts(state);
  renderOperations(state);
  renderRecommendations(state);
  renderPaymentMethods(state);
  syncHistoryControls();
  renderHistoryLog(state);
}

function showToast(title: string, text: string): void {
  const toast = document.querySelector<HTMLElement>('[data-balance-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-balance-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-balance-toast-text]');

  if (!toast || !titleNode || !textNode) {
    return;
  }

  titleNode.textContent = title;
  textNode.textContent = text;
  toast.hidden = false;

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function hideToast(): void {
  const toast = document.querySelector<HTMLElement>('[data-balance-toast]');
  const titleNode = document.querySelector<HTMLElement>('[data-balance-toast-title]');
  const textNode = document.querySelector<HTMLElement>('[data-balance-toast-text]');

  if (!toast) {
    return;
  }

  toast.hidden = true;

  if (titleNode) {
    titleNode.textContent = '';
  }

  if (textNode) {
    textNode.textContent = '';
  }
}

function closeModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('modal--open');
}

function openModal(modal: HTMLElement): void {
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('modal--open');
}

function openTopupModal(modal: HTMLElement, focusAmount = false): void {
  openModal(modal);

  if (!focusAmount) {
    return;
  }

  window.setTimeout(() => {
    const amountInput = modal.querySelector<HTMLInputElement>('input[name="amount"]');
    if (!amountInput) {
      return;
    }

    amountInput.focus();
    amountInput.select();
  }, 40);
}

function bindModalShell(modal: HTMLElement, signal: AbortSignal): void {
  modal.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        closeModal(modal);
      },
      { signal },
    );
  });

  modal.addEventListener(
    'click',
    (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    },
    { signal },
  );
}

export async function renderBalancePage(): Promise<string> {
  return renderTemplate(balanceTemplate, {});
}

export function Balance(): void | VoidFunction {
  if (balancePageLifecycleController) {
    balancePageLifecycleController.abort();
  }

  const root = document.querySelector('.balance-page');
  if (!root) {
    return;
  }

  const controller = new AbortController();
  balancePageLifecycleController = controller;
  const { signal } = controller;
  const state = getBalanceState();
  const topupModal = document.getElementById('balance-topup-modal');
  const paymentModal = document.getElementById('balance-payment-modal');
  const paymentAddModal = document.getElementById('balance-payment-add-modal');
  const historyModal = document.getElementById('balance-history-modal');
  const autopayModal = document.getElementById('balance-autopay-modal');
  const topupForm = document.getElementById('balance-topup-form') as HTMLFormElement | null;
  const paymentForm = document.getElementById('balance-payment-form') as HTMLFormElement | null;
  const paymentAddForm = document.getElementById('balance-payment-add-form') as HTMLFormElement | null;
  const autopayForm = document.getElementById('balance-autopay-form') as HTMLFormElement | null;
  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');

  activeHistoryFilter = 'all';
  activeHistoryQuery = '';

  if (logoutButton && navbarLogoutButton) {
    logoutButton.addEventListener(
      'click',
      () => {
        navbarLogoutButton.click();
      },
      { signal },
    );
  }

  hideToast();
  [topupModal, paymentModal, paymentAddModal, historyModal, autopayModal].forEach((modal) => {
    if (modal instanceof HTMLElement) {
      closeModal(modal);
    }
  });
  persistBalanceState(state);
  syncBalanceView(state);

  const selectAmount = (amount: number): void => {
    state.selectedAmount = amount;
    persistBalanceState(state);
    syncBalanceView(state);
  };

  document.querySelectorAll<HTMLElement>('[data-balance-amount]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        const amount = Number(node.dataset.balanceAmount || '0');
        if (amount > 0) {
          selectAmount(amount);
        }
      },
      { signal },
    );
  });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const modalAmountButton = target.closest<HTMLElement>('[data-balance-modal-amount]');
      if (modalAmountButton) {
        const amount = Number(modalAmountButton.dataset.balanceModalAmount || '0');
        if (amount > 0) {
          selectAmount(amount);
        }
        return;
      }

      const recommendation = target.closest<HTMLElement>('[data-balance-recommendation]');
      if (recommendation) {
        const action = recommendation.dataset.balanceRecommendation;
        if (action === 'topup' && topupModal instanceof HTMLElement) {
          openTopupModal(topupModal);
        }
        if (action === 'autopay' && autopayModal instanceof HTMLElement) {
          openModal(autopayModal);
        }
        return;
      }

      if (target.closest('[data-balance-open-topup-custom]')) {
        if (topupModal instanceof HTMLElement) {
          openTopupModal(topupModal, true);
        }
        return;
      }

      if (target.closest('[data-balance-modal-custom]')) {
        if (topupModal instanceof HTMLElement) {
          openTopupModal(topupModal, true);
        }
        return;
      }

      if (target.closest('[data-balance-open-history]')) {
        if (historyModal instanceof HTMLElement) {
          openModal(historyModal);
        }
        return;
      }

      const selectTrigger = target.closest<HTMLElement>('[data-balance-select-trigger]');
      if (selectTrigger) {
        const select = selectTrigger.closest<HTMLElement>('[data-balance-select]');
        if (!select) {
          return;
        }

        if (select.classList.contains('is-open')) {
          closeBalanceSelect(select);
        } else {
          openBalanceSelect(select);
        }
        return;
      }

      const selectOption = target.closest<HTMLElement>('[data-balance-select-option]');
      if (selectOption) {
        const select = selectOption.closest<HTMLElement>('[data-balance-select]');
        const value = selectOption.dataset.value || 'card';
        const label = selectOption.dataset.label || selectOption.textContent?.trim() || '';

        if (select) {
          syncBalanceSelectValue(select, value, label);
          closeBalanceSelect(select);
        }

        if (paymentAddForm) {
          syncPaymentAddFormKind(paymentAddForm);
        }
        return;
      }

      if (!target.closest('[data-balance-select]')) {
        document.querySelectorAll<HTMLElement>('[data-balance-select].is-open').forEach((select) => {
          closeBalanceSelect(select);
        });
      }

    },
    { signal },
  );

  document.querySelectorAll<HTMLElement>('[data-balance-open-topup]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        if (topupModal instanceof HTMLElement) {
          openTopupModal(topupModal);
        }
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>('[data-balance-open-autopay]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        if (autopayModal instanceof HTMLElement) {
          openModal(autopayModal);
        }
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>('[data-balance-open-payment]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        if (paymentModal instanceof HTMLElement) {
          openModal(paymentModal);
        }
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>('[data-balance-open-payment-add]').forEach((node) => {
    node.addEventListener(
      'click',
      () => {
        if (paymentModal instanceof HTMLElement) {
          closeModal(paymentModal);
        }

        if (paymentAddModal instanceof HTMLElement) {
          if (paymentAddForm) {
            paymentAddForm.reset();
            paymentAddForm.querySelector<HTMLElement>('[data-balance-payment-add-error]')!.textContent = '';

            const kindSelect = paymentAddForm.querySelector<HTMLElement>('[data-balance-select="kind"]');
            if (kindSelect) {
              syncBalanceSelectValue(kindSelect, 'card', 'Личная банковская карта');
              closeBalanceSelect(kindSelect);
            }

            syncPaymentAddFormKind(paymentAddForm);
          }

          openModal(paymentAddModal);
          window.setTimeout(() => {
            paymentAddModal.querySelector<HTMLInputElement>('input[name="cardNumber"]')?.focus();
          }, 40);
        }
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>('[data-balance-history-filter]').forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const nextFilter = button.dataset.balanceHistoryFilter as BalanceHistoryFilter | undefined;
        activeHistoryFilter = nextFilter || 'all';
        renderHistoryLog(state);
        syncHistoryControls();
      },
      { signal },
    );
  });

  document.querySelector<HTMLInputElement>('[data-balance-history-search]')?.addEventListener(
    'input',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      activeHistoryQuery = target.value;
      renderHistoryLog(state);
    },
    { signal },
  );

  document.querySelector<HTMLElement>('[data-balance-history-export]')?.addEventListener(
    'click',
    () => {
      const operations = getFilteredOperations(state.operations, activeHistoryFilter, activeHistoryQuery);

      if (!operations.length) {
        showToast('Нет данных для экспорта', 'Измените фильтр или поиск, чтобы выгрузить операции.');
        return;
      }

      exportOperationsToCsv(operations);
      showToast('CSV сформирован', 'Файл с историей операций уже скачивается.');
    },
    { signal },
  );

  if (topupModal instanceof HTMLElement) {
    bindModalShell(topupModal, signal);
  }

  if (historyModal instanceof HTMLElement) {
    bindModalShell(historyModal, signal);
  }

  if (paymentModal instanceof HTMLElement) {
    bindModalShell(paymentModal, signal);
  }

  if (paymentAddModal instanceof HTMLElement) {
    bindModalShell(paymentAddModal, signal);
  }

  if (autopayModal instanceof HTMLElement) {
    bindModalShell(autopayModal, signal);
  }

  if (topupForm) {
    topupForm.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.name !== 'amount') {
          return;
        }

        const nextAmount = Number(target.value || '0');
        state.selectedAmount = nextAmount > 0 ? nextAmount : 0;
        syncBalanceView(state);
      },
      { signal },
    );

    topupForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const amountInput = topupForm.elements.namedItem('amount');
        const errorNode = topupForm.querySelector<HTMLElement>('[data-balance-topup-error]');
        const amount =
          amountInput instanceof HTMLInputElement ? Number(amountInput.value || '0') : 0;

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (!amount || amount < 1000) {
          if (errorNode) {
            errorNode.textContent = 'Минимальная сумма пополнения — 1 000 ₽.';
          }
          return;
        }

        state.selectedAmount = amount;
        state.balanceValue += amount;
        state.operations = [
          {
            id: `topup_${Date.now()}`,
            title: 'Пополнение с карты',
            date: new Date().toISOString(),
            amount,
            status: 'Успешно',
            tone: 'success',
            details: `Пополнение через ${state.paymentMethod}`,
          },
          ...state.operations,
        ];

        persistBalanceState(state);
        syncBalanceView(state);
        closeModal(topupModal as HTMLElement);
        showToast(
          'Баланс пополнен',
          `На счет зачислено ${formatPrice(amount)}. Средства уже доступны для запуска кампаний.`,
        );
      },
      { signal },
    );
  }

  if (paymentForm) {
    paymentForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const methodInput = paymentForm.querySelector<HTMLInputElement>('input[name="method"]:checked');
        const errorNode = paymentForm.querySelector<HTMLElement>('[data-balance-payment-error]');
        const nextMethod = methodInput?.value?.trim() ?? '';

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (!nextMethod) {
          if (errorNode) {
            errorNode.textContent = 'Выберите способ оплаты, который станет основным.';
          }
          return;
        }

        state.paymentMethod = state.paymentMethods.some((method) => method.value === nextMethod)
          ? nextMethod
          : DEFAULT_PAYMENT_METHOD;

        persistBalanceState(state);
        syncBalanceView(state);
        closeModal(paymentModal as HTMLElement);
        showToast(
          'Способ оплаты обновлен',
          `${state.paymentMethod} теперь используется для пополнений и автоплатежа.`,
        );
      },
      { signal },
    );
  }

  if (paymentAddForm) {
    syncPaymentAddFormKind(paymentAddForm);

    paymentAddForm.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        if (target.name === 'cardNumber') {
          target.value = formatCardNumberInput(target.value);
          return;
        }

        if (target.name === 'expiry') {
          target.value = formatExpiryInput(target.value);
          return;
        }

        if (target.name === 'cvc') {
          target.value = target.value.replace(/\D/g, '').slice(0, 3);
          return;
        }

        if (target.name === 'accountNumber') {
          target.value = target.value.replace(/\D/g, '').slice(0, 20);
          return;
        }

        if (target.name === 'inn') {
          target.value = target.value.replace(/\D/g, '').slice(0, 12);
          return;
        }

        if (target.name === 'bik') {
          target.value = target.value.replace(/\D/g, '').slice(0, 9);
        }
      },
      { signal },
    );

    paymentAddForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const kindInput = paymentAddForm.elements.namedItem('kind');
        const aliasInput = paymentAddForm.elements.namedItem('alias');
        const cardNumberInput = paymentAddForm.elements.namedItem('cardNumber');
        const expiryInput = paymentAddForm.elements.namedItem('expiry');
        const cvcInput = paymentAddForm.elements.namedItem('cvc');
        const holderNameInput = paymentAddForm.elements.namedItem('holderName');
        const companyNameInput = paymentAddForm.elements.namedItem('companyName');
        const bankNameInput = paymentAddForm.elements.namedItem('bankName');
        const accountNumberInput = paymentAddForm.elements.namedItem('accountNumber');
        const errorNode = paymentAddForm.querySelector<HTMLElement>('[data-balance-payment-add-error]');

        const kind = kindInput instanceof HTMLInputElement
          ? (kindInput.value as PaymentMethodKind)
          : 'card';
        const alias = aliasInput instanceof HTMLInputElement ? aliasInput.value.trim() : '';
        const cardNumber = cardNumberInput instanceof HTMLInputElement
          ? cardNumberInput.value.replace(/\D/g, '')
          : '';
        const expiry = expiryInput instanceof HTMLInputElement ? expiryInput.value.trim() : '';
        const cvc = cvcInput instanceof HTMLInputElement ? cvcInput.value.replace(/\D/g, '') : '';
        const holderName = holderNameInput instanceof HTMLInputElement ? holderNameInput.value.trim() : '';
        const companyName = companyNameInput instanceof HTMLInputElement ? companyNameInput.value.trim() : '';
        const bankName = bankNameInput instanceof HTMLInputElement ? bankNameInput.value.trim() : '';
        const innInput = paymentAddForm.elements.namedItem('inn');
        const bikInput = paymentAddForm.elements.namedItem('bik');
        const inn = innInput instanceof HTMLInputElement ? innInput.value.replace(/\D/g, '') : '';
        const bik = bikInput instanceof HTMLInputElement ? bikInput.value.replace(/\D/g, '') : '';
        const accountNumber = accountNumberInput instanceof HTMLInputElement
          ? accountNumberInput.value.replace(/\D/g, '')
          : '';

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (kind === 'invoice') {
          if (!companyName || !bankName || accountNumber.length !== 20) {
            if (errorNode) {
              errorNode.textContent = 'Для счета укажите организацию, банк и расчетный счет из 20 цифр.';
            }
            return;
          }

          if (!(inn.length === 10 || inn.length === 12)) {
            if (errorNode) {
              errorNode.textContent = 'Для счета укажите ИНН из 10 или 12 цифр.';
            }
            return;
          }

          if (bik.length !== 9) {
            if (errorNode) {
              errorNode.textContent = 'БИК должен содержать 9 цифр.';
            }
            return;
          }
        } else {
          const [monthValue] = expiry.split('/');
          const month = Number(monthValue || '0');

          if (cardNumber.length < 16) {
            if (errorNode) {
              errorNode.textContent = 'Введите полный номер карты из 16 цифр.';
            }
            return;
          }

          if (!expiry || expiry.length !== 5 || month < 1 || month > 12) {
            if (errorNode) {
              errorNode.textContent = 'Укажите срок действия карты в формате MM/YY.';
            }
            return;
          }

          if (cvc.length !== 3) {
            if (errorNode) {
              errorNode.textContent = 'CVC код должен содержать 3 цифры.';
            }
            return;
          }

          if (kind === 'card' && !holderName) {
            if (errorNode) {
              errorNode.textContent = 'Укажите имя держателя карты.';
            }
            return;
          }
        }

        const method: PaymentMethodOption = kind === 'invoice'
          ? {
            id: `payment_${Date.now()}`,
            kind,
            value: alias || `Счет ${companyName}`,
            caption: `${bankName}, р/с •••• ${accountNumber.slice(-4)}`,
            note: 'Безналично',
          }
          : {
            id: `payment_${Date.now()}`,
            kind,
            value: `${alias || (kind === 'corporate' ? 'Корпоративная карта' : 'Личная карта')} •••• ${cardNumber.slice(-4)}`,
            caption: kind === 'card' ? holderName : 'Корпоративная карта команды',
            note: kind === 'corporate' ? `до ${expiry}` : 'Личная карта',
          };

        state.paymentMethods = [method, ...state.paymentMethods];
        state.paymentMethod = method.value;

        persistBalanceState(state);
        syncBalanceView(state);
        paymentAddForm.reset();

        const kindSelect = paymentAddForm.querySelector<HTMLElement>('[data-balance-select="kind"]');
        if (kindSelect) {
          syncBalanceSelectValue(kindSelect, 'card', 'Личная банковская карта');
          closeBalanceSelect(kindSelect);
        }
        syncPaymentAddFormKind(paymentAddForm);

        closeModal(paymentAddModal as HTMLElement);
        if (paymentModal instanceof HTMLElement) {
          openModal(paymentModal);
        }
        showToast(
          'Способ оплаты добавлен',
          `${method.value} добавлен в список и выбран основным.`,
        );
      },
      { signal },
    );

  }

  if (autopayForm) {
    autopayForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const enabledInput = autopayForm.elements.namedItem('enabled');
        const thresholdInput = autopayForm.elements.namedItem('threshold');
        const limitInput = autopayForm.elements.namedItem('limit');
        const errorNode = autopayForm.querySelector<HTMLElement>('[data-balance-autopay-error]');
        const enabled = enabledInput instanceof HTMLInputElement ? enabledInput.checked : false;
        const threshold =
          thresholdInput instanceof HTMLInputElement ? Number(thresholdInput.value || '0') : 0;
        const limit = limitInput instanceof HTMLInputElement ? Number(limitInput.value || '0') : 0;

        if (errorNode) {
          errorNode.textContent = '';
        }

        if (enabled && threshold < 1000) {
          if (errorNode) {
            errorNode.textContent = 'Порог автоплатежа должен быть не меньше 1 000 ₽.';
          }
          return;
        }

        if (enabled && limit < threshold) {
          if (errorNode) {
            errorNode.textContent = 'Лимит автоплатежа не может быть меньше порога.';
          }
          return;
        }

        state.autopayEnabled = enabled;
        state.autopayThreshold = Math.max(1000, threshold || state.autopayThreshold);
        state.autopayLimit = Math.max(state.autopayThreshold, limit || state.autopayLimit);

        persistBalanceState(state);
        syncBalanceView(state);
        closeModal(autopayModal as HTMLElement);
        showToast(
          'Настройки автоплатежа сохранены',
          enabled
            ? `Пополнение включится при падении ниже ${formatPrice(state.autopayThreshold)}.`
            : 'Автопополнение отключено. Контролируйте остаток вручную.',
        );
      },
      { signal },
    );
  }

  document.querySelector('[data-balance-toast-close]')?.addEventListener(
    'click',
    () => {
      hideToast();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (topupModal instanceof HTMLElement && topupModal.getAttribute('aria-hidden') === 'false') {
        closeModal(topupModal);
      }

      if (historyModal instanceof HTMLElement && historyModal.getAttribute('aria-hidden') === 'false') {
        closeModal(historyModal);
      }

      if (paymentModal instanceof HTMLElement && paymentModal.getAttribute('aria-hidden') === 'false') {
        closeModal(paymentModal);
      }

      if (
        paymentAddModal instanceof HTMLElement &&
        paymentAddModal.getAttribute('aria-hidden') === 'false'
      ) {
        closeModal(paymentAddModal);
      }

      document.querySelectorAll<HTMLElement>('[data-balance-select].is-open').forEach((select) => {
        closeBalanceSelect(select);
      });

      if (
        autopayModal instanceof HTMLElement &&
        autopayModal.getAttribute('aria-hidden') === 'false'
      ) {
        closeModal(autopayModal);
      }
    },
    { signal },
  );

  return () => {
    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }

    if (balancePageLifecycleController === controller) {
      balancePageLifecycleController = null;
    }

    controller.abort();
  };
}

