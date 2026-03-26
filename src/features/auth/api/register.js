import { request } from '../../../shared/lib/request.js';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error.js';
import { markAuthenticated } from '../model/state.js';
import { writeStoredUser } from '../model/storage.js';

export async function registerUser({ email, phone, password }) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedPassword = password.trim();

    const registerResponse = await request('/advertiser/register', {
      method: 'POST',
      body: JSON.stringify({
        email: normalizedEmail,
        phone: normalizedPhone,
        password: normalizedPassword,
      }),
    });

    writeStoredUser(registerResponse.data);
    markAuthenticated();

    return { ok: true, user: registerResponse.data };
  } catch (error) {
    return {
      ok: false,
      message: normalizeAuthErrorMessage(error.message),
    };
  }
}
