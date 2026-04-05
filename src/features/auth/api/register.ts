import { request } from 'shared/lib/request';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error';
import { authState, type AuthUser } from '../model/storage';

export interface RegisterUserParams {
  email: string;
  phone: string;
  password: string;
}

export async function registerUser({ email, phone, password }: RegisterUserParams) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedPassword = password.trim();

    const registerResponse = await request<AuthUser>(
      '/advertiser/register',
      {
        method: 'POST',
        body: {
          email: normalizedEmail,
          phone: normalizedPhone,
          password: normalizedPassword,
        },
      },
    );

    authState.setAuthenticatedUser(registerResponse.data);

    return { user: registerResponse.data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  }
}
