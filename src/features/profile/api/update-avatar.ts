import { request } from 'shared/lib/request';
import type { AdvertiserProfileResponse } from './update-profile';

export async function updateAvatar(file: File): Promise<AdvertiserProfileResponse> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await request<AdvertiserProfileResponse>('/advertiser/me/avatar', {
    method: 'PUT',
    body: formData,
  });

  return response.data;
}
