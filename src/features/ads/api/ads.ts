import { request } from 'shared/lib/request';
import type { AdCampaignStatus } from './contracts';

export interface AdResponse {
  id: number;
  title: string;
  short_desc: string;
  image_url: string;
  target_url: string;
  status: AdCampaignStatus;
}

export interface ListAdsResponse {
  group_id: number;
  ads: AdResponse[];
}

export interface CreateAdRequest {
  title: string;
  short_desc: string;
  target_url: string;
}

export interface CreateAdResponse {
  id: number;
}

export interface UpdateAdRequest {
  title?: string;
  short_desc?: string;
  target_url?: string;
  status?: AdCampaignStatus;
}

export async function getAdsInGroup(
  campaignId: number,
  groupId: number,
): Promise<ListAdsResponse> {
  const response = await request<ListAdsResponse>(
    `/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads`,
    { method: 'GET' },
  );
  return response.data;
}

export async function createAdInGroup(
  campaignId: number,
  groupId: number,
  payload: CreateAdRequest,
  imageFile?: File,
): Promise<CreateAdResponse> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('short_desc', payload.short_desc);
  formData.append('target_url', payload.target_url);
  if (imageFile) formData.append('image', imageFile);

  const response = await request<CreateAdResponse>(
    `/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads`,
    { method: 'POST', body: formData },
  );
  return response.data;
}

export async function updateAdInGroup(
  campaignId: number,
  groupId: number,
  adId: number,
  payload: UpdateAdRequest,
  imageFile?: File,
): Promise<void> {
  const formData = new FormData();
  if (payload.title !== undefined) formData.append('title', payload.title);
  if (payload.short_desc !== undefined) formData.append('short_desc', payload.short_desc);
  if (payload.target_url !== undefined) formData.append('target_url', payload.target_url);
  if (payload.status !== undefined) formData.append('status', payload.status);
  if (imageFile) formData.append('image', imageFile);

  await request(`/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads/${adId}`, {
    method: 'PUT',
    body: formData,
  });
}

export async function deleteAdInGroup(
  campaignId: number,
  groupId: number,
  adId: number,
): Promise<void> {
  await request(`/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads/${adId}`, {
    method: 'DELETE',
  });
}
