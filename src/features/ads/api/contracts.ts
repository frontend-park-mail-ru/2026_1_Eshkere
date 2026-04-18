export type AdCampaignStatus =
  | 'turned_off'
  | 'moderation'
  | 'working'
  | 'rejected'
  | 'not_enough_money';

export interface AdCampaignResponse {
  id: number;
  name: string;
  daily_budget: number;
  status: AdCampaignStatus;
}

export interface ListAdCampaignsResponse {
  advertiser_id: number;
  campaigns: AdCampaignResponse[];
}

export interface CreateAdCampaignRequest {
  name: string;
  daily_budget: number;
  title?: string;
  short_desc?: string;
  image_url?: string;
  target_url?: string;
}

export interface CreateAdCampaignResponse {
  id: number;
}

export interface UpdateAdCampaignRequest {
  name?: string;
  daily_budget?: number;
  status?: AdCampaignStatus;
  title?: string;
  short_desc?: string;
  image_url?: string;
  target_url?: string;
}
