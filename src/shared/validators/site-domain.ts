/**
 * Собирает абсолютный http(s)-URL для парсера: голый хост, путь, полный URL, //host.
 *
 * @param {string} raw Строка из поля.
 * @return {string} Строка для new URL().
 */
function toAbsoluteHttpUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  if (t.startsWith('//')) {
    return `https:${t}`;
  }
  return `https://${t}`;
}

function isAcceptableHost(host: string): boolean {
  if (!host) {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }
  if (host.includes(':')) {
    return true;
  }
  return host.includes('.');
}

/**
 * Проверяет поле «домен / URL сайта»: допускаются голый хост, полный URL с путём и query.
 *
 * @param {string} value Введённая строка.
 * @return {string} Пустая строка при успехе или текст ошибки.
 */
export function validateSiteDomainOrUrl(value: string): string {
  const v = value.trim();
  if (!v) {
    return 'Укажите домен или URL сайта';
  }

  try {
    const parsed = new URL(toAbsoluteHttpUrl(v));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Разрешены только адреса с протоколом http или https';
    }

    const host = parsed.hostname;
    if (!isAcceptableHost(host)) {
      return 'Укажите корректный домен или полный URL (например, example.ru или https://site.ru/page)';
    }

    return '';
  } catch {
    return 'Укажите корректный домен или URL (например, site.ru или https://site.ru/page)';
  }
}

/**
 * Название площадки не должно быть пустым.
 *
 * @param {string} value Введённая строка.
 * @return {string} Пустая строка при успехе или текст ошибки.
 */
export function validateSiteTitle(value: string): string {
  if (!value.trim()) {
    return 'Введите название сайта';
  }
  return '';
}

/**
 * Разбирает ввод пользователя в URL после тех же правил, что и validateSiteDomainOrUrl.
 *
 * @param {string} value Строка из поля «Домен или URL».
 * @return {URL | null} Объект URL или null, если формат не подходит.
 */
export function parseSiteInputToHttpUrl(value: string): URL | null {
  const v = value.trim();
  if (!v) {
    return null;
  }

  try {
    const parsed = new URL(toAbsoluteHttpUrl(v));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!isAcceptableHost(parsed.hostname)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
