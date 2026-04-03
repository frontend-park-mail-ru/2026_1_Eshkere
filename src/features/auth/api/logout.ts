import { request } from 'shared/lib/request';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error';
import { authState } from '../model/storage';

export async function logoutUser() {
  try {
    await request('/advertiser/logout', { method: 'POST' });
    return {};
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  } finally {
    authState.clearAuthState();
  }
}
