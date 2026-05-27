import { request } from 'shared/lib/request';
import type { TargetingValue } from '../model/targeting';

export type GenderType = 'male' | 'female' | 'man' | 'woman' | 'any';
type ApiGenderType = 'man' | 'woman' | 'any';

export interface AdGroupResponse {
  id: number;
  name: string;
  age_from: number;
  age_to: number;
  gender: GenderType;
  region: TargetingValue;
  topic: TargetingValue;
  region_id?: TargetingValue;
  topic_id?: TargetingValue;
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
  region: string;
  topic: string;
}

export interface CreateAdGroupResponse {
  id: number;
}

export interface CreateAdGroupOptions {
  rollbackCampaignOnError?: boolean;
}

export interface UpdateAdGroupRequest {
  name?: string;
  age_from?: number;
  age_to?: number;
  gender?: GenderType;
  region?: string;
  topic?: string;
}

function normalizeGender(gender: GenderType): ApiGenderType {
  if (gender === 'male') return 'man';
  if (gender === 'female') return 'woman';
  if (gender === 'woman') return 'woman';
  if (gender === 'man') return 'man';
  return 'any';
}

function toCreateRequestBody(
  payload: CreateAdGroupRequest,
): Omit<CreateAdGroupRequest, 'gender'> & { gender: ApiGenderType } {
  return {
    ...payload,
    gender: normalizeGender(payload.gender),
  };
}

function toUpdateRequestBody(payload: UpdateAdGroupRequest): UpdateAdGroupRequest {
  if (!payload.gender) {
    return payload;
  }

  return {
    ...payload,
    gender: normalizeGender(payload.gender),
  };
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
  options: CreateAdGroupOptions = {},
): Promise<CreateAdGroupResponse> {
  const rollbackQuery = options.rollbackCampaignOnError
    ? '?rollback_campaign_on_error=true'
    : '';
  const response = await request<CreateAdGroupResponse>(
    `/ad_campaigns/${campaignId}/ad_groups${rollbackQuery}`,
    { method: 'POST', body: toCreateRequestBody(payload) },
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
    body: toUpdateRequestBody(payload),
  });
}

export async function deleteAdGroup(campaignId: number, groupId: number): Promise<void> {
  await request(`/ad_campaigns/${campaignId}/ad_groups/${groupId}`, {
    method: 'DELETE',
  });
}
