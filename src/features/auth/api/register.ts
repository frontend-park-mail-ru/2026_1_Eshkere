import { ApiRequestError, request } from 'shared/lib/request';
import { normalizeAuthErrorMessage } from '../lib/normalize-auth-error';

export interface RegisterUserParams {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface RegisterResponse {
  email: string;
  phone: string;
  verification_required?: boolean;
  message?: string;
}

interface VerifyRegisterResponse {
  message?: string;
}

type RegisterUserResult =
  | { data: RegisterResponse; status: number; error?: false }
  | { error: true; message: string; status?: number };

type VerifyRegisterEmailResult =
  | { data: VerifyRegisterResponse; status: number; error?: false }
  | { error: true; message: string };

export interface VerifyRegisterEmailParams {
  email: string;
  code: string;
}

export async function registerUser({
  name,
  email,
  phone,
  password,
}: RegisterUserParams): Promise<RegisterUserResult> {
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

    return {
      data: registerResponse.data,
      status: registerResponse.status,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 409) {
        return { error: true, message: 'Почта или телефон уже заняты', status: 409 };
      }
      if (error.status === 400) {
        return { error: true, message: normalizeAuthErrorMessage(error.message), status: 400 };
      }
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { error: true, message: normalizeAuthErrorMessage(msg) };
  }
}

export async function verifyRegisterEmail({
  email,
  code,
}: VerifyRegisterEmailParams): Promise<VerifyRegisterEmailResult> {
  try {
    const response = await request<VerifyRegisterResponse>(
      '/advertisers/register/verify',
      {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          code: code.trim(),
        },
      },
    );

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 400) {
      return {
        error: true,
        message: 'Неверный или истекший код',
      };
    }

    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAuthErrorMessage(msg),
    };
  }
}
