const PASSWORD_ALLOWED_CHARS =
  /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]+$/;

/**
 * Валидирует поле пароля.
 *
 * @param {string} value Значение пароля.
 * @return {string} Пустая строка при успехе, иначе сообщение ошибки.
 */
export function validatePassword(value) {
  const normalized = value.trim();

  if (!normalized) {
    return 'Введите пароль';
  }

  if (/\s/.test(value)) {
    return 'Пароль не должен содержать пробелы';
  }

  if (normalized.length < 6) {
    return 'Пароль должен быть не короче 6 символов';
  }

  if (normalized.length > 128) {
    return 'Пароль должен быть не длиннее 128 символов';
  }

  if (!PASSWORD_ALLOWED_CHARS.test(normalized)) {
    return (
      'Пароль может содержать только латинские буквы, цифры ' + 'и спецсимволы'
    );
  }

  return '';
}
