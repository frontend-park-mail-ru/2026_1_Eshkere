import { request } from 'shared/lib/request';
import type {
  CreateAdCampaignRequest,
  CreateAdCampaignResponse,
} from './contracts';

export async function createAdCampaign(payload: CreateAdCampaignRequest) {
  const response = await request<CreateAdCampaignResponse>('/ad_campaigns', {
    method: 'POST',
    body: payload,
  });

  return response.data;
}
