/**
 * Р‘Р°Р·РѕРІС‹Р№ URL РґР»СЏ РІСЃРµС… РІС‹Р·РѕРІРѕРІ backend API СЃ С„СЂРѕРЅС‚РµРЅРґР°.
 * @type {string}
 */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  return LOCAL_HOSTNAMES.has(window.location.hostname)
    ? 'http://localhost:8000'
    : '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
