import { ApiRequestError, request } from 'shared/lib/request';
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
        surname: profile.surname,
        balance: profile.balance,
        avatar: profile.avatar_url,
        isModerator: profile.is_moderator,
        role: profile.role,
        canChangePassword: profile.can_change_password,
      });
    }

    return { user: authState.getCurrentUser()! };
  } catch (error: unknown) {
    if (error instanceof ApiRequestError && error.status === 401) {
      const normalized = error.message.trim().toLowerCase();
      const isInvalidCredentials =
        normalized.includes('invalid credentials') ||
        normalized.includes('invalid identifier or password') ||
        normalized.includes('invalid password') ||
        normalized.includes('неверн');

      if (!isInvalidCredentials) {
        return {
          error: true,
          message: 'Сначала подтвердите почту',
        };
      }
    }

    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  }
}
