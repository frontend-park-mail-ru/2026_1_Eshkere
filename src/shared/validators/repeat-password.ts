/**
 * Валидирует поле подтверждения пароля.
 *
 * @param {string} password Исходный пароль.
 * @param {string} repeatPassword Подтверждение пароля.
 * @return {string} Пустая строка при успехе, иначе сообщение ошибки.
 */
export function validateRepeatPassword(
  password: string,
  repeatPassword: string,
): string {
  if (!repeatPassword.trim()) {
    return 'Повторите пароль';
  }

  if (password !== repeatPassword) {
    return 'Пароли не совпадают';
  }

  return '';
}
