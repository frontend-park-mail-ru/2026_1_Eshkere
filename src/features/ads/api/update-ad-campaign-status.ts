import { request } from 'shared/lib/request';

export async function pauseAdCampaign(campaignId: number): Promise<void> {
  await request(`/ad_campaigns/${campaignId}/status`, {
    method: 'PATCH',
    body: { status: 'turned_off' },
  });
}
