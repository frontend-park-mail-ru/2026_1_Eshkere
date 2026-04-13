export type BalanceOperationTone = 'success' | 'warning' | 'info' | 'muted';
export type BalanceRecommendationAction = 'topup' | 'autopay';
export type BalanceHistoryFilter = 'all' | 'topup' | 'charge' | 'refund';
export type PaymentMethodKind = 'card' | 'corporate' | 'invoice';

export interface BalanceOperation {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: string;
  tone: BalanceOperationTone;
  details: string;
}

export interface PaymentMethodOption {
  id: string;
  kind: PaymentMethodKind;
  value: string;
  caption: string;
  note?: string;
  badge?: string;
  draft?: PaymentMethodDraft;
}

export interface BalanceDashboardState {
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

export interface RecommendationRow {
  title: string;
  description: string;
  actionKey: BalanceRecommendationAction;
}

export interface BalanceHistoryState {
  filter: BalanceHistoryFilter;
  query: string;
}

export interface PaymentMethodDraft {
  kind: PaymentMethodKind;
  alias: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  holderName: string;
  companyName: string;
  bankName: string;
  inn: string;
  bik: string;
  accountNumber: string;
}
