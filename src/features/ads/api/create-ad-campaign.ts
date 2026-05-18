import { request } from 'shared/lib/request';
import type {
  CreateAdCampaignRequest,
  CreateAdCampaignResponse,
} from './contracts';
import { updateAdCampaign } from './update-ad-campaign';

export async function createAdCampaign(payload: CreateAdCampaignRequest) {
  const response = await request<CreateAdCampaignResponse>('/ad_campaigns', {
    method: 'POST',
    body: payload,
  });

  const created = response.data;
  await updateAdCampaign(created.id, { status: 'working' });

  return created;
}
