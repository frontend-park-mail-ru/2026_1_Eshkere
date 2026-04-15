import { request } from 'shared/lib/request';

export interface UpdateProfileParams {
  name?: string;
  email?: string;
  phone?: string;
}

export interface AdvertiserProfileResponse {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  balance?: number;
  created_at?: string;
}

export async function updateProfile(params: UpdateProfileParams): Promise<AdvertiserProfileResponse> {
  const formData = new FormData();

  if (params.name !== undefined) {
    formData.append('name', params.name);
  }
  if (params.email !== undefined) {
    formData.append('email', params.email);
  }
  if (params.phone !== undefined) {
    formData.append('phone', params.phone);
  }

  const response = await request<AdvertiserProfileResponse>('/advertiser/me', {
    method: 'PUT',
    body: formData,
  });

  return response.data;
}
