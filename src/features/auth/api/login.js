import { request } from '../../../shared/lib/request.js';
import { normalizePhone } from '../../../shared/validators';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error.js';
import { markAuthenticated } from '../model/state.js';
import { writeStoredUser } from '../model/storage.js';

export async function loginUser({ identifier, password }) {
  try {
    const normalizedIdentifier =
      normalizePhone(identifier) || identifier.trim();

    const response = await request('/advertiser/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: normalizedIdentifier,
        password: password.trim(),
      }),
    });

    writeStoredUser(response.data);
    markAuthenticated();

    return { ok: true, user: response.data };
  } catch (error) {
    return {
      ok: false,
      message: normalizeAuthErrorMessage(error.message),
    };
  }
}
