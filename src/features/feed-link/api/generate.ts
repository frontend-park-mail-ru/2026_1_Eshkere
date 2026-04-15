import { request } from 'shared/lib/request';

export interface FeedLinkResponse {
  url: string;
}

export async function generateFeedLink(): Promise<FeedLinkResponse> {
  const response = await request<FeedLinkResponse>('/advertiser/feed-link', {
    method: 'POST',
  });
  return response.data;
}
