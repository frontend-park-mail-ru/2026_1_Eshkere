import { request } from 'shared/lib/request';
import type { UpdateAdCampaignRequest } from './contracts';

export async function updateAdCampaign(
  adCampaignId: number,
  payload: UpdateAdCampaignRequest,
) {
  await request(`/ad_campaigns/${adCampaignId}`, {
    method: 'PUT',
    body: payload,
  });
}
