/**
 * Проверяет, соответствует ли значение формату электронной почты.
 *
 * @param {string} value Проверяемое значение.
 * @return {boolean} Является ли значение корректной почтой.
 */
export function isEmail(value: string): boolean {
  const normalized = String(value || '').trim();

  if (normalized.length < 6 || normalized.length > 254) {
    return false;
  }

  const atMatches = normalized.match(/@/g) || [];
  if (atMatches.length !== 1) {
    return false;
  }

  const [localPart, domainPart] = normalized.split('@');
  if (!localPart || !domainPart) {
    return false;
  }

  if (localPart.length > 64) {
    return false;
  }

  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.')
  ) {
    return false;
  }

  return true;
}

/**
 * Валидирует поле электронной почты.
 *
 * @param {string} value Значение электронной почты.
 * @return {string} Пустая строка при успехе, иначе сообщение ошибки.
 */
export function validateEmail(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return 'Введите email в формате name@example.com';
  }

  if (!isEmail(normalized)) {
    return 'Неверный формат email, пример: name@example.com';
  }

  return '';
}
