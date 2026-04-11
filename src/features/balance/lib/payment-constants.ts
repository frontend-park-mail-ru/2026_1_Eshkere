import type { PaymentMethodKind } from '../model/types';

export const DEFAULT_PAYMENT_KIND: PaymentMethodKind = 'card';
export const DEFAULT_PAYMENT_KIND_LABEL = 'Личная банковская карта';

export const PAYMENT_ADD_ALIAS_PLACEHOLDERS: Record<
  PaymentMethodKind,
  string
> = {
  card: 'Например, Личная карта для пополнений',
  corporate: 'Например, Карта команды маркетинга',
  invoice: 'Например, Основной расчетный счет',
};
