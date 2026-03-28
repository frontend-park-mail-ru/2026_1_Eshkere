import { request } from 'shared/lib/request.js';
import { normalizeAdsErrorMessage } from '../lib/normalize-ads-error.js';

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
 * @return {Promise<{ads: !Array<AdItem>,
 *   error?: boolean,
 *   message?: string}>} Результат загрузки объявлений.
 */
export async function getAds() {
  try {
    const response = await request('/ads', {
      method: 'GET',
    });

    return {
      ads: response.data.ads || [],
    };
  } catch (error) {
    return {
      error: true,
      message: normalizeAdsErrorMessage(error.message),
      ads: [],
    };
  }
}
