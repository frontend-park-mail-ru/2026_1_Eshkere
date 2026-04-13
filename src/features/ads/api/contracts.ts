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
}

export interface CreateAdCampaignResponse {
  id: number;
}

export interface UpdateAdCampaignRequest {
  name?: string;
  daily_budget?: number;
  status?: AdCampaignStatus;
}
