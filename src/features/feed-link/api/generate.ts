import { request } from 'shared/lib/request';

export interface FeedLinkResponse {
  url: string;
}

export async function generateFeedLink(campaignID: number): Promise<FeedLinkResponse> {
  const response = await request<FeedLinkResponse>(`/ad_campaigns/${campaignID}/feed`, {
    method: 'POST',
  });
  return response.data;
}
