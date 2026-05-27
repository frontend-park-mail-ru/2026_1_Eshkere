import { request } from 'shared/lib/request';
import { normalizePhone } from 'shared/validators';
import { normalizeAuthErrorMessage } from 'features/auth/lib/normalize-auth-error';
import { authState } from 'entities/user';

export interface LoginPartnerParams {
  identifier: string;
  password: string;
}

interface PartnerLoginResponse {
  id: number;
  email: string;
  phone: string;
}

export async function loginPartner({ identifier, password }: LoginPartnerParams) {
  try {
    const normalizedIdentifier = normalizePhone(identifier) || identifier.trim();

    const response = await request<PartnerLoginResponse>('/partners/login', {
      method: 'POST',
      body: {
        identifier: normalizedIdentifier,
        password: password.trim(),
      },
    });

    authState.setAuthenticatedUser({
      ...response.data,
      userType: 'partner',
    });

    return { user: authState.getCurrentUser()! };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: true, message: normalizeAuthErrorMessage(msg) };
  }
}
