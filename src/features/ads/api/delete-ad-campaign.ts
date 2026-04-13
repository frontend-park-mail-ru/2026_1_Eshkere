import { request } from 'shared/lib/request';

export async function deleteAdCampaign(adCampaignId: number) {
  await request(`/ad_campaigns/${adCampaignId}`, {
    method: 'DELETE',
  });
}
