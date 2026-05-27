import { ApiRequestError, request } from 'shared/lib/request';

export interface RequestPasswordResetParams {
  identifier: string;
}

export interface ConfirmPasswordResetParams extends RequestPasswordResetParams {
  code: string;
  newPassword: string;
}

interface PasswordResetResponse {
  message?: string;
}

export type PasswordResetResult =
  | { data: PasswordResetResponse; status: number; error?: false }
  | { error: true; status?: number; message: string };

function getPayloadMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }

  if ('message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }

  return '';
}

function getResetErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 500) {
      return 'Не удалось отправить код, попробуйте позже';
    }

    if (error.status === 400) {
      const backendMessage = getPayloadMessage(error.payload).toLowerCase();
      if (
        backendMessage.includes('password') ||
        backendMessage.includes('парол') ||
        backendMessage.includes('short') ||
        backendMessage.includes('короч')
      ) {
        return 'Пароль должен быть не короче 6 символов';
      }

      return fallback;
    }
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

export async function requestPasswordReset({
  identifier,
}: RequestPasswordResetParams): Promise<PasswordResetResult> {
  try {
    const response = await request<PasswordResetResponse>(
      '/advertisers/password/reset',
      {
        method: 'POST',
        body: {
          identifier: identifier.trim(),
        },
      },
    );

    return { data: response.data, status: response.status };
  } catch (error: unknown) {
    const status = error instanceof ApiRequestError ? error.status : undefined;
    return {
      error: true,
      status,
      message: getResetErrorMessage(
        error,
        'Не удалось отправить код, попробуйте позже',
      ),
    };
  }
}

export async function confirmPasswordReset({
  identifier,
  code,
  newPassword,
}: ConfirmPasswordResetParams): Promise<PasswordResetResult> {
  try {
    const response = await request<PasswordResetResponse>(
      '/advertisers/password/reset/confirm',
      {
        method: 'POST',
        body: {
          identifier: identifier.trim(),
          code: code.trim(),
          new_password: newPassword,
        },
      },
    );

    return { data: response.data, status: response.status };
  } catch (error: unknown) {
    const status = error instanceof ApiRequestError ? error.status : undefined;
    return {
      error: true,
      status,
      message: getResetErrorMessage(
        error,
        'Неверный код или срок его действия истёк',
      ),
    };
  }
}
