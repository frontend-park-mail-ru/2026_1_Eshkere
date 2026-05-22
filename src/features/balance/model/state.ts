import { authState } from 'entities/user';
import {
  LocalStorageKey,
  createLocalStorageKey,
  localStorageService,
} from 'shared/lib/local-storage';
import type {
  BalanceDashboardState,
  BalanceOperationTone,
} from './types';

const BALANCE_STORAGE_KEY = LocalStorageKey.BalanceDashboardState;

function getBalanceStorageKey(): string {
  const currentUser = authState.getCurrentUser();
  const suffix =
    typeof currentUser?.id === 'number' && currentUser.id > 0
      ? String(currentUser.id)
      : 'guest';

  return createLocalStorageKey(BALANCE_STORAGE_KEY, suffix);
}

function getInitialState(): BalanceDashboardState {
  const currentUser = authState.getCurrentUser();

  return {
    balanceValue:
      typeof currentUser?.balance === 'number' ? currentUser.balance : 0,
    moderationReserve: 0,
    monthlySpend: 0,
    autopayEnabled: false,
    autopayThreshold: 5000,
    autopayLimit: 30000,
    savedPaymentMethodId: null,
    savedPaymentMethodTitle: null,
    vatEnabled: true,
    selectedAmount: 10000,
    operations: [],
  };
}

function normalizeOperations(
  rawOperations: BalanceDashboardState['operations'] | undefined,
): BalanceDashboardState['operations'] {
  if (!Array.isArray(rawOperations)) {
    return [];
  }

  return rawOperations.filter(Boolean).map((item, index) => ({
    id: typeof item?.id === 'string' ? item.id : `op_${index}`,
    title:
      typeof item?.title === 'string' && item.title.trim()
        ? item.title.trim()
        : 'Операция',
    date:
      typeof item?.date === 'string' ? item.date : new Date().toISOString(),
    amount: typeof item?.amount === 'number' ? item.amount : 0,
    status:
      typeof item?.status === 'string' && item.status.trim()
        ? item.status.trim()
        : 'Проверка',
    tone: ['success', 'warning', 'info', 'muted'].includes(String(item?.tone))
      ? (item?.tone as BalanceOperationTone)
      : 'muted',
    details:
      typeof item?.details === 'string' ? item.details.trim() : '',
  }));
}

function normalizeState(raw: unknown): BalanceDashboardState {
  const initial = getInitialState();

  if (!raw || typeof raw !== 'object') {
    return initial;
  }

  const data = raw as Partial<BalanceDashboardState>;

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
    savedPaymentMethodId:
      typeof data.savedPaymentMethodId === 'string'
        ? data.savedPaymentMethodId
        : null,
    savedPaymentMethodTitle:
      typeof data.savedPaymentMethodTitle === 'string'
        ? data.savedPaymentMethodTitle
        : null,
    vatEnabled:
      typeof data.vatEnabled === 'boolean'
        ? data.vatEnabled
        : initial.vatEnabled,
    selectedAmount:
      typeof data.selectedAmount === 'number' && data.selectedAmount > 0
        ? data.selectedAmount
        : initial.selectedAmount,
    operations: normalizeOperations(data.operations),
  };
}

export function getBalanceState(): BalanceDashboardState {
  return normalizeState(
    localStorageService.getJson<Partial<BalanceDashboardState>>(
      getBalanceStorageKey(),
    ),
  );
}

export function persistBalanceState(state: BalanceDashboardState): void {
  localStorageService.setJson(getBalanceStorageKey(), state);

  const currentUser = authState.getCurrentUser();
  if (!currentUser) {
    return;
  }

  authState.setAuthenticatedUser({
    ...currentUser,
    balance: state.balanceValue,
  });
}
