/**
 * Нормализует текст ошибки авторизации для интерфейса.
 *
 * @param {string} message Исходное сообщение об ошибке.
 * @return {string} Нормализованный текст ошибки.
 */
export function normalizeAuthErrorMessage(message) {
  const normalized = String(message || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return 'Не удалось выполнить запрос, попробуйте еще раз';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Не удалось подключиться к серверу, попробуйте еще раз';
  }

  if (
    normalized.includes('invalid credentials') ||
    normalized.includes('invalid identifier or password') ||
    normalized.includes('unauthorized') ||
    normalized.includes('неверно') ||
    normalized.includes('invalid password')
  ) {
    return 'Такого пользователя не существует или пароль неверный';
  }

  if (
    normalized.includes('already exists') ||
    normalized.includes('уже существует') ||
    normalized.includes('already registered')
  ) {
    return 'Пользователь с такими данными уже зарегистрирован';
  }

  if (
    normalized.includes('invalid request') ||
    normalized.includes('bad request')
  ) {
    return 'Проверьте корректность введённых данных';
  }

  if (
    normalized.includes('session not found') ||
    (normalized.includes('сесс') && normalized.includes('не найден'))
  ) {
    return 'Сессия истекла, войдите снова';
  }

  if (normalized.includes('email')) {
    return 'Проверьте электронную почту';
  }

  if (normalized.includes('phone') || normalized.includes('телефон')) {
    return 'Проверьте номер телефона';
  }

  if (normalized.includes('password') || normalized.includes('пароль')) {
    return 'Проверьте пароль';
  }

  return message;
}
