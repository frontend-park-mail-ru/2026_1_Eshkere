import { parseDigitsNumber } from 'shared/lib/digits';

interface AmountRangeOptions {
  max?: number;
  maxMessage?: string;
  min?: number;
  minMessage?: string;
  requiredMessage: string;
}

export function parseAmountInput(value: string): number {
  return parseDigitsNumber(value);
}

export function validateAmountRange(
  value: string | number,
  options: AmountRangeOptions,
): string {
  const amount = typeof value === 'number' ? value : parseAmountInput(value);

  if (!amount) {
    return options.requiredMessage;
  }

  if (typeof options.min === 'number' && amount < options.min) {
    return options.minMessage ?? `Минимальная сумма ${options.min} ₽`;
  }

  if (typeof options.max === 'number' && amount > options.max) {
    return options.maxMessage ?? `Максимальная сумма ${options.max} ₽`;
  }

  return '';
}

export function validateMinAmount(
  amount: number,
  min: number,
  message: string,
): string {
  return amount < min ? message : '';
}

export function validateAmountNotLessThan(
  amount: number,
  minAmount: number,
  message: string,
): string {
  return amount < minAmount ? message : '';
}
