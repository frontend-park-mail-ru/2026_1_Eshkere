import { request } from 'shared/lib/request';

export type GenderType = 'man' | 'woman' | 'any';

export interface AdGroupResponse {
  id: number;
  name: string;
  age_from: number;
  age_to: number;
  gender: GenderType;
  region_id: number;
  topic_id: number;
}

export interface ListAdGroupsResponse {
  ad_campaign_id: number;
  groups: AdGroupResponse[];
}

export interface CreateAdGroupRequest {
  name: string;
  age_from: number;
  age_to: number;
  gender: GenderType;
  region_id: number;
  topic_id: number;
}

export interface CreateAdGroupResponse {
  id: number;
}

export interface UpdateAdGroupRequest {
  name?: string;
  age_from?: number;
  age_to?: number;
  gender?: GenderType;
  region_id?: number;
  topic_id?: number;
}

export async function getAdGroups(campaignId: number): Promise<ListAdGroupsResponse> {
  const response = await request<ListAdGroupsResponse>(
    `/ad_campaigns/${campaignId}/ad_groups`,
    { method: 'GET' },
  );
  return response.data;
}

export async function createAdGroup(
  campaignId: number,
  payload: CreateAdGroupRequest,
): Promise<CreateAdGroupResponse> {
  const response = await request<CreateAdGroupResponse>(
    `/ad_campaigns/${campaignId}/ad_groups`,
    { method: 'POST', body: payload },
  );
  return response.data;
}

export async function updateAdGroup(
  campaignId: number,
  groupId: number,
  payload: UpdateAdGroupRequest,
): Promise<void> {
  await request(`/ad_campaigns/${campaignId}/ad_groups/${groupId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteAdGroup(campaignId: number, groupId: number): Promise<void> {
  await request(`/ad_campaigns/${campaignId}/ad_groups/${groupId}`, {
    method: 'DELETE',
  });
}
