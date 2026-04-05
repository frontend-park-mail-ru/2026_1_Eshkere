/**
 * Нормализует текст ошибки загрузки объявлений.
 *
 * @param {string} message Исходное сообщение об ошибке.
 * @return {string} Сообщение для интерфейса.
 */
export function normalizeAdsErrorMessage(message: unknown): string {
  const normalized = String(message || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return 'Не удалось загрузить объявления, попробуйте еще раз';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Не удалось подключиться к серверу, попробуйте еще раз';
  }

  if (
    normalized.includes('unauthorized') ||
    normalized.includes('не авториз')
  ) {
    return 'Сессия истекла, войдите снова';
  }

  return String(message || '');
}
