import { request } from 'shared/lib/request';
import { normalizeAuthErrorMessage } from 'features/auth/lib/normalize-auth-error';
import { authState } from 'entities/user';

export async function logoutPartner() {
  try {
    await request('/partners/logout', { method: 'POST' });
    return {};
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: true, message: normalizeAuthErrorMessage(msg) };
  } finally {
    authState.clearAuthState();
  }
}
