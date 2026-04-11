import { getDigitsWithMax } from './digits';

export function formatCardNumber(value: string): string {
  return getDigitsWithMax(value, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatCardExpiry(
  value: string,
  separator = '/',
): string {
  const digits = getDigitsWithMax(value, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}${separator}${digits.slice(2)}`;
}
