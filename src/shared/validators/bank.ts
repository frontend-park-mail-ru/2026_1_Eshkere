import { getDigits } from 'shared/lib/digits';

interface InnValidationOptions {
  invalidLengthMessage?: string;
  requiredMessage?: string;
}

interface FixedDigitsValidationConfig {
  invalidLengthMessage: string;
  length: number;
  requiredMessage: string;
}

interface FixedDigitsValidationOverrides {
  invalidLengthMessage?: string;
  requiredMessage?: string;
}

function validateFixedDigits(
  value: string,
  options: FixedDigitsValidationConfig,
): string {
  const digits = getDigits(value);

  if (!digits) {
    return options.requiredMessage;
  }

  if (digits.length !== options.length) {
    return options.invalidLengthMessage;
  }

  return '';
}

export function validateInn(
  value: string,
  options: InnValidationOptions = {},
): string {
  const digits = getDigits(value);

  if (!digits) {
    return options.requiredMessage ?? 'Введите ИНН компании';
  }

  if (digits.length !== 10 && digits.length !== 12) {
    return (
      options.invalidLengthMessage ?? 'ИНН должен содержать 10 или 12 цифр'
    );
  }

  return '';
}

export function validateBik(
  value: string,
  options: FixedDigitsValidationOverrides = {},
): string {
  return validateFixedDigits(value, {
    length: 9,
    requiredMessage: options.requiredMessage ?? 'Введите БИК банка',
    invalidLengthMessage:
      options.invalidLengthMessage ?? 'БИК должен содержать 9 цифр.',
  });
}

export function validateBankAccountNumber(
  value: string,
  options: FixedDigitsValidationOverrides = {},
): string {
  return validateFixedDigits(value, {
    length: 20,
    requiredMessage: options.requiredMessage ?? 'Введите расчетный счет',
    invalidLengthMessage:
      options.invalidLengthMessage ??
      'Расчетный счет должен содержать 20 цифр.',
  });
}
