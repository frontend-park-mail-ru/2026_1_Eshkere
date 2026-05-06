import type { AdCampaignStatus } from 'entities/campaign';

export type { AdCampaignStatus };

export interface AdCampaignResponse {
  id: number;
  name: string;
  daily_budget?: number;
  main_action?: 'look' | 'click' | string;
  status: AdCampaignStatus;
}

export interface ListAdCampaignsResponse {
  advertiser_id: number;
  campaigns: AdCampaignResponse[];
}

export interface CreateAdCampaignRequest {
  name: string;
  main_action?: 'look' | 'click';
  daily_budget?: number;
  cpm_price: number;
}

export interface CreateAdCampaignResponse {
  id: number;
}

export interface UpdateAdCampaignRequest {
  name?: string;
  main_action?: 'look' | 'click';
  daily_budget?: number;
  cpm_price?: number;
  status?: AdCampaignStatus;
}
