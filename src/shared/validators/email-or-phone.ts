import { isEmail } from './email';
import { isPhone } from './phone';

/**
 * Валидирует поле электронной почты или телефона в форме входа.
 *
 * @param {string} value Входное значение.
 * @return {string} Пустая строка при успехе, иначе сообщение ошибки.
 */
export function validateEmailOrPhone(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return (
      'Введите email в формате name@example.com\n' +
      'или телефон в формате +7 999 123 45 67'
    );
  }

  if (!isEmail(normalized) && !isPhone(normalized)) {
    return (
      'Неверный формат: email должен быть вида ' +
      'name@example.com,\nтелефон — +7 999 123 45 67'
    );
  }

  return '';
}
