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

const API_CACHE_NAME = 'api-responses-v1';
const OFFLINE_EVENT_NAME = 'app:offline-error';
export const OFFLINE_ERROR_MESSAGE =
  'Нет подключения к интернету. Проверьте сеть и попробуйте снова.';

export type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export interface ApiResponse<T> {
  data: T;
}

function getErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Ошибка запроса';
  }

  if ('error' in payload && typeof payload.error === 'string' && payload.error) {
    return payload.error;
  }

  if (
    'message' in payload &&
    typeof payload.message === 'string' &&
    payload.message
  ) {
    return payload.message;
  }

  return 'Ошибка запроса';
}

function normalizeResponse<T>(payload: unknown): ApiResponse<T> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as ApiResponse<T>;
  }

  return { data: payload as T };
}

function isGetRequest(options: RequestOptions): boolean {
  return (options.method || 'GET').toUpperCase() === 'GET';
}

function isUnsafeMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${safeName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function isCsrfError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.trim().toLowerCase();
  return normalized.includes('csrf token required') || normalized.includes('csrf blocked');
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.trim().toLowerCase();

  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('internet') ||
    normalized.includes('network request failed')
  );
}

export function isOfflineErrorMessage(message: unknown): boolean {
  return String(message || '').trim() === OFFLINE_ERROR_MESSAGE;
}

async function getCache(): Promise<Cache | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  return await window.caches.open(API_CACHE_NAME);
}

async function readCachedResponse<T>(url: string): Promise<ApiResponse<T> | null> {
  const cache = await getCache();
  if (!cache) {
    return null;
  }

  const cachedResponse = await cache.match(url);
  if (!cachedResponse) {
    return null;
  }

  const payload = await cachedResponse.json().catch(() => null);
  return normalizeResponse<T>(payload);
}

async function writeCachedResponse(url: string, response: Response): Promise<void> {
  const cache = await getCache();
  if (!cache) {
    return;
  }

  await cache.put(url, response);
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, headers: customHeaders, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;
  const isGet = isGetRequest(options);
  const method = String(options.method || 'GET').toUpperCase();

  const isFormData = body instanceof FormData;

  const execute = async (): Promise<Response> => {
    const csrfToken = isUnsafeMethod(method) ? getCookie('csrf_token') : '';
    return await fetch(url, {
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(customHeaders || {}),
      },
      ...rest,
      body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  };

  try {
    let response = await execute();
    let responseClone = response.clone();
    let payload = await response.json().catch(() => null);

    if (!response.ok && isUnsafeMethod(method) && isCsrfError(getErrorMessage(payload))) {
      response = await execute();
      responseClone = response.clone();
      payload = await response.json().catch(() => null);
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(payload));
    }

    if (isGet) {
      await writeCachedResponse(url, responseClone);
    }

    return normalizeResponse<T>(payload);
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(OFFLINE_EVENT_NAME, {
            detail: { message: OFFLINE_ERROR_MESSAGE },
          }),
        );
      }

      if (isGet) {
        const cachedResponse = await readCachedResponse<T>(url);
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      throw new Error(OFFLINE_ERROR_MESSAGE);
    }

    throw error instanceof Error ? error : new Error(String(error));
  }
}
