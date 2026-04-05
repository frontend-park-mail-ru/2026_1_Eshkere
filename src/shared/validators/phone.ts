/**
 * Оставляет только цифры из телефонной строки.
 *
 * @param {string} value Исходное значение телефона.
 * @return {string} Строка только с цифрами.
 */
export function getPhoneDigits(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Нормализует телефон к полному формату РФ, если это возможно.
 *
 * @param {string} value Исходное значение телефона.
 * @return {string} Телефон в формате +7XXXXXXXXXX или пустая строка.
 */
export function normalizePhone(value: unknown): string {
  const normalizedValue = String(value || '').trim();

  if (!/^[\d\s()+-]+$/.test(normalizedValue)) {
    return '';
  }

  let digits = getPhoneDigits(normalizedValue);

  if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length !== 11 || !digits.startsWith('7') || digits[1] !== '9') {
    return '';
  }

  return `+${digits}`;
}

/**
 * Проверяет, соответствует ли значение формату телефона.
 *
 * @param {string} value Проверяемое значение.
 * @return {boolean} Является ли значение корректным телефоном.
 */
export function isPhone(value: unknown): boolean {
  return Boolean(normalizePhone(value));
}

/**
 * Валидирует поле телефона.
 *
 * @param {string} value Значение телефона.
 * @return {string} Пустая строка при успехе, иначе сообщение ошибки.
 */
export function validatePhone(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return 'Введите телефон';
  }

  if (!isPhone(normalized)) {
    return 'Введите телефон в формате +7 999 123 45 67';
  }

  return '';
}
