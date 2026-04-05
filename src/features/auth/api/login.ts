import { request } from 'shared/lib/request';
import { normalizePhone } from 'shared/validators';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error';
import { authState, type AuthUser } from '../model/storage';


export interface LoginUserParams {
  identifier: string;
  password: string;
}


export async function loginUser({ identifier, password }: LoginUserParams) {
  try {
    const normalizedIdentifier =
      normalizePhone(identifier) || identifier.trim();

    const response = await request<AuthUser>('/advertiser/login', {
      method: 'POST',
      body: {
        identifier: normalizedIdentifier,
        password: password.trim(),
      },
    });

    authState.setAuthenticatedUser(response.data);

    return { user: response.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  }
}
