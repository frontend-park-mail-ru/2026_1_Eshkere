import { request } from 'shared/lib/request';

export interface UpdateProfileParams {
  name?: string;
  email?: string;
  phone?: string;
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
  const response = await request<AdvertiserProfileResponse>('/advertisers/me', {
    method: 'GET',
  });

  return response.data;
}

export async function updateProfile(params: UpdateProfileParams): Promise<AdvertiserProfileResponse> {
  const response = await request<AdvertiserProfileResponse>('/advertisers/me', {
    method: 'PUT',
    body: params,
  });

  return response.data;
}
