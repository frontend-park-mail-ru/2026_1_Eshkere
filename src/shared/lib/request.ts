import { API_BASE_URL } from '../config/api';

/**
 * Выполняет HTTP-запрос к API сервера с JSON-настройками по умолчанию.
 * Если передан `body`, он сериализуется через JSON.stringify.
 *
 * @template T
 * @param {string} path - Относительный путь API, начинающийся с `/`.
 * @param {RequestInit} [options={}] - Переопределения опций fetch.
 * @return {Promise<T>} Распарсенный JSON-ответ сервера.
 * @throws {Error} Если статус ответа неуспешный.
 */

export type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T }> {
  const { body, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...rest,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Ошибка запроса');
  }

  return data as { data: T };
}
