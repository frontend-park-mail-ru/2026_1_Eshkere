import { request } from 'shared/lib/request.js';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error.js';
import { authState } from '../model/storage.js';

export async function logoutUser() {
  try {
    await request('/advertiser/logout', { method: 'POST' });
    return {};
  } catch (error) {
    return {
      error: true,
      message: normalizeAuthErrorMessage(error.message),
    };
  } finally {
    authState.clearAuthState();
  }
}
