import { authState } from 'features/auth';
import { LocalStorageKey, localStorageService } from 'shared/lib/local-storage';
import type {
  BalanceDashboardState,
  BalanceOperation,
  BalanceOperationTone,
  PaymentMethodKind,
  PaymentMethodOption,
} from './types';

const BALANCE_STORAGE_KEY = LocalStorageKey.BalanceDashboardState;

export const DEFAULT_PAYMENT_METHOD = 'Банковская карта •••• 4481';

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

function getFallbackOperationTitle(
  item: Partial<BalanceOperation>,
  index: number,
): string {
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

  return createDefaultOperations()[index]?.title ?? 'Операция';
}

function getFallbackOperationStatus(
  item: Partial<BalanceOperation>,
  index: number,
): string {
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

  return createDefaultOperations()[index]?.status ?? 'Проверка';
}

function sanitizeOperationTitle(
  item: Partial<BalanceOperation>,
  index: number,
): string {
  const value = typeof item.title === 'string' ? item.title.trim() : '';

  if (!value || hasMojibake(value)) {
    return getFallbackOperationTitle(item, index);
  }

  return value;
}

function sanitizeOperationStatus(
  item: Partial<BalanceOperation>,
  index: number,
): string {
  const value = typeof item.status === 'string' ? item.status.trim() : '';

  if (!value || hasMojibake(value)) {
    return getFallbackOperationStatus(item, index);
  }

  return value;
}

function sanitizeOperationDetails(
  item: Partial<BalanceOperation>,
  index: number,
): string {
  const value = typeof item.details === 'string' ? item.details.trim() : '';

  if (!value || hasMojibake(value)) {
    return (
      createDefaultOperations()[index]?.details ??
      'Без дополнительного комментария'
    );
  }

  return value;
}

function getInitialState(): BalanceDashboardState {
  const currentUser = authState.getCurrentUser();
  const paymentMethods = createDefaultPaymentMethods();
  const paymentMethod = sanitizePaymentMethod(currentUser?.cardMasked);

  return {
    balanceValue:
      typeof currentUser?.balance === 'number' ? currentUser.balance : 48200,
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

function normalizePaymentMethods(
  rawPaymentMethods: BalanceDashboardState['paymentMethods'] | undefined,
): PaymentMethodOption[] {
  const fallbackPaymentMethods = createDefaultPaymentMethods();

  if (!Array.isArray(rawPaymentMethods)) {
    return fallbackPaymentMethods;
  }

  return rawPaymentMethods.filter(Boolean).map((item, index) => ({
    id: typeof item?.id === 'string' ? item.id : `payment_${index}`,
    kind: ['card', 'corporate', 'invoice'].includes(String(item?.kind))
      ? (item?.kind as PaymentMethodKind)
      : 'card',
    value: sanitizePaymentMethod(item?.value),
    caption:
      typeof item?.caption === 'string' &&
      item.caption.trim() &&
      !hasMojibake(item.caption)
        ? item.caption.trim()
        : (fallbackPaymentMethods[index]?.caption ??
          'Способ оплаты для операций в кабинете'),
    note:
      typeof item?.note === 'string' &&
      item.note.trim() &&
      !hasMojibake(item.note)
        ? item.note.trim()
        : (fallbackPaymentMethods[index]?.note ?? 'Добавлено вручную'),
  }));
}

function normalizeOperations(
  rawOperations: BalanceDashboardState['operations'] | undefined,
  initialState: BalanceDashboardState,
): BalanceDashboardState['operations'] {
  if (!Array.isArray(rawOperations)) {
    return initialState.operations;
  }

  return rawOperations.filter(Boolean).map((item, index) => ({
    id: typeof item?.id === 'string' ? item.id : `op_${index}`,
    title: sanitizeOperationTitle(item ?? {}, index),
    date: typeof item?.date === 'string' ? item.date : new Date().toISOString(),
    amount: typeof item?.amount === 'number' ? item.amount : 0,
    status: sanitizeOperationStatus(item ?? {}, index),
    tone: ['success', 'warning', 'info', 'muted'].includes(String(item?.tone))
      ? (item?.tone as BalanceOperationTone)
      : 'muted',
    details: sanitizeOperationDetails(item ?? {}, index),
  }));
}

function normalizeState(raw: unknown): BalanceDashboardState {
  const initial = getInitialState();

  if (!raw || typeof raw !== 'object') {
    return initial;
  }

  const data = raw as Partial<BalanceDashboardState>;
  const paymentMethods = normalizePaymentMethods(data.paymentMethods);
  const selectedPaymentMethod = sanitizePaymentMethod(data.paymentMethod);

  return {
    balanceValue:
      typeof data.balanceValue === 'number'
        ? data.balanceValue
        : initial.balanceValue,
    moderationReserve:
      typeof data.moderationReserve === 'number'
        ? data.moderationReserve
        : initial.moderationReserve,
    monthlySpend:
      typeof data.monthlySpend === 'number'
        ? data.monthlySpend
        : initial.monthlySpend,
    autopayEnabled:
      typeof data.autopayEnabled === 'boolean'
        ? data.autopayEnabled
        : initial.autopayEnabled,
    autopayThreshold:
      typeof data.autopayThreshold === 'number'
        ? data.autopayThreshold
        : initial.autopayThreshold,
    autopayLimit:
      typeof data.autopayLimit === 'number'
        ? data.autopayLimit
        : initial.autopayLimit,
    paymentMethod: paymentMethods.some(
      (item) => item.value === selectedPaymentMethod,
    )
      ? selectedPaymentMethod
      : (paymentMethods[0]?.value ?? DEFAULT_PAYMENT_METHOD),
    paymentMethods,
    vatEnabled:
      typeof data.vatEnabled === 'boolean'
        ? data.vatEnabled
        : initial.vatEnabled,
    selectedAmount:
      typeof data.selectedAmount === 'number' && data.selectedAmount > 0
        ? data.selectedAmount
        : initial.selectedAmount,
    operations: normalizeOperations(data.operations, initial),
  };
}

export function getBalanceState(): BalanceDashboardState {
  return normalizeState(
    localStorageService.getJson<Partial<BalanceDashboardState>>(
      BALANCE_STORAGE_KEY,
    ),
  );
}

export function persistBalanceState(state: BalanceDashboardState): void {
  localStorageService.setJson(BALANCE_STORAGE_KEY, state);

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
