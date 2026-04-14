/**
 * Базовый URL для всех вызовов backend API с фронтенда.
 * @type {string}
 */
function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://212.233.96.112:8000';
  }

  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
