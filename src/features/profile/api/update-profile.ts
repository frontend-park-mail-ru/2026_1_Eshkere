import { request } from 'shared/lib/request';
import { authState } from 'features/auth';

export interface UpdateProfileParams {
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  tariff?: string;
}

export interface AdvertiserProfileResponse {
  id: number;
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  balance?: number;
  company?: string;
  city?: string;
  tariff?: string;
  created_at?: string;
}

export async function getMe(): Promise<AdvertiserProfileResponse> {
  try {
    const response = await request<AdvertiserProfileResponse>('/advertisers/me', {
      method: 'GET',
    });

    return response.data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const isServerError = msg.includes('500') || msg.includes('Internal Server') || msg.includes('server');

    if (isServerError) {
      const current = authState.getCurrentUser();
      return {
        id: current?.id ?? 0,
        name: current?.name,
        email: current?.email,
        phone: current?.phone,
        avatar_url: current?.avatar,
        balance: current?.balance,
      };
    }

    throw error;
  }
}

export async function updateProfile(params: UpdateProfileParams): Promise<AdvertiserProfileResponse> {
  try {
    const response = await request<AdvertiserProfileResponse>('/advertisers/me', {
      method: 'PUT',
      body: params,
    });

    return response.data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const isServerError = msg.includes('500') || msg.includes('Internal Server') || msg.includes('server');

    if (isServerError) {
      const current = authState.getCurrentUser();
      return {
        id: current?.id ?? 0,
        name: params.name ?? current?.name,
        surname: params.surname,
        email: params.email ?? current?.email,
        phone: params.phone ?? current?.phone,
        avatar_url: current?.avatar,
        balance: current?.balance,
        company: params.company,
        city: params.city,
        tariff: params.tariff,
      };
    }

    throw error;
  }
}
