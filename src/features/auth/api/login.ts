import { request } from 'shared/lib/request';
import { normalizePhone } from 'shared/validators';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error';
import { authState, type AuthUser } from '../model/storage';
import { getMe } from 'features/profile/api/update-profile';

export interface LoginUserParams {
  identifier: string;
  password: string;
}

interface LoginResponse {
  id: number;
  email: string;
  phone: string;
}

export async function loginUser({ identifier, password }: LoginUserParams) {
  try {
    const normalizedIdentifier =
      normalizePhone(identifier) || identifier.trim();

    const response = await request<LoginResponse>('/advertisers/login', {
      method: 'POST',
      body: {
        identifier: normalizedIdentifier,
        password: password.trim(),
      },
    });

    const base: AuthUser = response.data;
    authState.setAuthenticatedUser(base);

    const profile = await getMe().catch(() => null);
    if (profile) {
      authState.setAuthenticatedUser({
        ...base,
        name: profile.name,
        balance: profile.balance,
        avatar: profile.avatar_url,
      });
    }

    return { user: authState.getCurrentUser()! };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  }
}
