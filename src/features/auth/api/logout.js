import {request} from '../../../shared/lib/request.js';
import {normalizeAuthErrorMessage} from '../lib/normalize-auth-error.js';
import {clearAuthState} from '../model/state.js';

export async function logoutUser() {
  try {
    await request('/advertiser/logout', {method: 'POST'});
    return {ok: true};
  } catch (error) {
    return {
      ok: false,
      message: normalizeAuthErrorMessage(error.message),
    };
  } finally {
    clearAuthState();
  }
}