import { request } from 'shared/lib/request.js';
import { normalizePhone } from 'shared/validators';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error.js';
import { authState } from '../model/storage.js';

export async function loginUser({ identifier, password }) {
  try {
    const normalizedIdentifier =
      normalizePhone(identifier) || identifier.trim();

    const response = await request('/advertiser/login', {
      method: 'POST',
      body: {
        identifier: normalizedIdentifier,
        password: password.trim(),
      },
    });

    authState.setAuthenticatedUser(response.data);

    return { user: response.data };
  } catch (error) {
    return {
      error: true,
      message: normalizeAuthErrorMessage(error.message),
    };
  }
}
