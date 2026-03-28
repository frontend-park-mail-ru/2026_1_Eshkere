import { request } from 'shared/lib/request.js';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error.js';
import { authState } from '../model/storage.js';

export async function registerUser({ email, phone, password }) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedPassword = password.trim();

    const registerResponse = await request('/advertiser/register', {
      method: 'POST',
      body: {
        email: normalizedEmail,
        phone: normalizedPhone,
        password: normalizedPassword,
      },
    });

    authState.setAuthenticatedUser(registerResponse.data);

    return { user: registerResponse.data };
  } catch (error) {
    return {
      error: true,
      message: normalizeAuthErrorMessage(error.message),
    };
  }
}
