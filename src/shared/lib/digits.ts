export function getDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function getDigitsWithMax(value: string, maxLength: number): string {
  return getDigits(value).slice(0, maxLength);
}

export function parseDigitsNumber(value: string): number {
  return Number(getDigits(value) || '0');
}
