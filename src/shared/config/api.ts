/**
 * Базовый URL для всех вызовов backend API с фронтенда.
 * @type {string}
 */
function isIpAddress(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://212.233.96.112:8000';
  }

  const { protocol, hostname } = window.location;

  if (isIpAddress(hostname)) {
    return `${protocol}//${hostname}:8000`;
  }

  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
