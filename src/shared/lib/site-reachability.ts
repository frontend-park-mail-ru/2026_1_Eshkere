/**
 * Проверка доступности сайта из браузера: запрос к корню origin в режиме no-cors.
 * Ответ не читается (opaque), но при ошибке сети, TLS или таймауте промис fetch отклоняется.
 */

const DEFAULT_TIMEOUT_MS = 12000;

export type SiteReachabilityResult =
  | { ok: true }
  | { ok: false; reason: 'mixed_content'; message: string }
  | { ok: false; reason: 'unreachable'; message: string }
  | { ok: false; reason: 'cancelled' };

/**
 * Проверяет, что по указанному URL можно установить HTTP-соединение.
 *
 * @param siteUrl Разобранный адрес (используется origin).
 * @param options.signal Отмена при уходе со страницы.
 * @param options.timeoutMs Таймаут запроса.
 */
export async function checkSiteReachable(
  siteUrl: URL,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<SiteReachabilityResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const outerSignal = options?.signal;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const mergeAbort = (): void => {
    controller.abort();
  };

  outerSignal?.addEventListener('abort', mergeAbort);

  const probeUrl = `${siteUrl.origin}/`;

  try {
    await fetch(probeUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);
    outerSignal?.removeEventListener('abort', mergeAbort);

    return { ok: true };
  } catch (err) {
    window.clearTimeout(timeoutId);
    outerSignal?.removeEventListener('abort', mergeAbort);

    if (outerSignal?.aborted) {
      return { ok: false, reason: 'cancelled' };
    }

    if (
      controller.signal.aborted ||
      (err instanceof DOMException && err.name === 'AbortError')
    ) {
      return {
        ok: false,
        reason: 'unreachable',
        message:
          'Сайт не ответил вовремя или запрос был прерван. Попробуйте ещё раз.',
      };
    }

    return {
      ok: false,
      reason: 'unreachable',
      message: 'Такого домена не существует. Проверьте написание.',
    };
  }
}
