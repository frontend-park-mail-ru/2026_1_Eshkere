import {request} from '../utils/request.js';

/**
 * Нормализует текст ошибки загрузки объявлений.
 *
 * @param {string} message Исходное сообщение об ошибке.
 * @return {string} Сообщение для интерфейса.
 */
function normalizeAdsErrorMessage(message) {
  const normalized = String(message || '').trim().toLowerCase();

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

  return message;
}

/**
 * @typedef {Object} AdItem
 * @property {(string|number)} [id]
 * @property {string} [title]
 * @property {number} [price]
 * @property {string} [target_action]
 * @property {string} [created_at]
 */

/**
 * Загружает список объявлений с сервера.
 *
 * @return {Promise<{ok: boolean, ads: !Array<AdItem>,
 *   message: (string|undefined)}>} Результат загрузки объявлений.
 */
export async function getAds() {
  try {
    const response = await request('/ads', {
      method: 'GET',
    });

    return {
      ok: true,
      ads: response.data.ads || [],
    };
  } catch (error) {
    return {
      ok: false,
      message: normalizeAdsErrorMessage(error.message),
      ads: [],
    };
  }
}
