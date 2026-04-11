import { getDigits } from 'shared/lib/digits';

interface CardExpiryValidationOptions {
  expiredMessage?: string;
  invalidFormatMessage?: string;
  invalidMonthMessage?: string;
  requireFuture?: boolean;
}

interface CardNumberValidationOptions {
  length?: number;
  message?: string;
}

interface CardCvvValidationOptions {
  maxLength?: number;
  message: string;
  minLength?: number;
}

export function validateCardNumber(
  value: string,
  options: CardNumberValidationOptions = {},
): string {
  const length = options.length ?? 16;
  return getDigits(value).length === length
    ? ''
    : options.message ?? 'Введите корректный номер карты';
}

export function validateCardExpiry(
  value: string,
  options: CardExpiryValidationOptions = {},
): string {
  const digits = getDigits(value);

  if (digits.length !== 4) {
    return (
      options.invalidFormatMessage ??
      'Введите срок действия в формате MM / YY'
    );
  }

  const month = Number(digits.slice(0, 2));
  const year = Number(digits.slice(2, 4));

  if (month < 1 || month > 12) {
    return options.invalidMonthMessage ?? 'Укажите корректный месяц';
  }

  if (options.requireFuture) {
    const today = new Date();
    const currentYear = today.getFullYear() % 100;
    const currentMonth = today.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return options.expiredMessage ?? 'Срок действия карты уже истек';
    }
  }

  return '';
}

export function validateCardCvv(
  value: string,
  options: CardCvvValidationOptions,
): string {
  const digits = getDigits(value);
  const minLength = options.minLength ?? 3;
  const maxLength = options.maxLength ?? minLength;

  return digits.length >= minLength && digits.length <= maxLength
    ? ''
    : options.message;
}
