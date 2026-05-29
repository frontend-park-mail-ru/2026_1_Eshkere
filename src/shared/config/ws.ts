/**
 * Базовый URL для WebSocket-подключений к backend.
 * Логика зеркалит {@link API_BASE_URL}: тот же хост/префикс, протокол ws/wss.
 */

function isIpAddress(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

export function resolveWsBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://212.233.96.112:8000';
  }

  const { protocol, hostname } = window.location;

  if (isIpAddress(hostname)) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}:8000`;
  }

  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/api`;
}

/**
 * Собирает полный WebSocket URL из относительного пути и query-параметров.
 *
 * @param path — путь от корня API, например `/ws/support`.
 * @param query — опциональные query-параметры.
 */
export function buildWsUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = resolveWsBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}
