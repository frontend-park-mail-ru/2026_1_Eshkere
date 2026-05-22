export type BalanceOperationTone = 'success' | 'warning' | 'info' | 'muted';
export type BalanceRecommendationAction = 'topup' | 'autopay';
export type BalanceHistoryFilter = 'all' | 'topup' | 'charge' | 'refund';

export interface BalanceOperation {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: string;
  tone: BalanceOperationTone;
  details: string;
}

export interface BalanceDashboardState {
  balanceValue: number;
  moderationReserve: number;
  monthlySpend: number;
  autopayEnabled: boolean;
  autopayThreshold: number;
  autopayLimit: number;
  savedPaymentMethodId: string | null;
  savedPaymentMethodTitle: string | null;
  vatEnabled: boolean;
  selectedAmount: number;
  operations: BalanceOperation[];
}

export interface RecommendationRow {
  title: string;
  description: string;
  actionKey: BalanceRecommendationAction;
}

export interface BalanceHistoryState {
  filter: BalanceHistoryFilter;
  query: string;
}
