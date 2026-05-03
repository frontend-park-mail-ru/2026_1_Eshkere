import { request } from 'shared/lib/request';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error';
import { authState, type AuthUser } from '../model/storage';
import { getMe } from 'features/profile/api/update-profile';

export interface RegisterUserParams {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface RegisterResponse {
  id: number;
  email: string;
  phone: string;
}

export async function registerUser({ name, email, phone, password }: RegisterUserParams) {
  try {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedPassword = password.trim();

    const registerResponse = await request<RegisterResponse>(
      '/advertisers/register',
      {
        method: 'POST',
        body: {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: normalizedPassword,
        },
      },
    );

    const base: AuthUser = { ...registerResponse.data, name: normalizedName };
    authState.setAuthenticatedUser(base);

    const profile = await getMe().catch(() => null);
    if (profile) {
      authState.setAuthenticatedUser({
        ...base,
        name: profile.name ?? normalizedName,
        balance: profile.balance,
        avatar: profile.avatar_url,
      });
    }

    return { user: authState.getCurrentUser()! };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  }
}
