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
  image_url: string;
  target_url: string;
}

export interface CreateAdResponse {
  id: number;
}

export interface UpdateAdRequest {
  id?: number;
  title?: string;
  short_desc?: string;
  image_url?: string;
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
): Promise<CreateAdResponse> {
  const response = await request<CreateAdResponse>(
    `/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads`,
    { method: 'POST', body: payload },
  );
  return response.data;
}

export async function updateAdInGroup(
  campaignId: number,
  groupId: number,
  adId: number,
  payload: UpdateAdRequest,
): Promise<void> {
  await request(`/ad_campaigns/${campaignId}/ad_groups/${groupId}/ads/${adId}`, {
    method: 'PUT',
    body: payload,
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
