import { request } from 'shared/lib/request';
import { normalizeAdsErrorMessage } from '../lib/normalize-ads-error';
import type {
  AdCampaignResponse,
  AdCampaignStatus,
  ListAdCampaignsResponse,
} from './contracts';

export interface AdItem {
  id?: number;
  title?: string;
  price?: number;
  target_action?: string;
  created_at?: string;
  status?: AdCampaignStatus;
}

export interface GetAdsSuccess {
  ads: AdItem[];
  error?: false;
  message?: undefined;
}

export interface GetAdsFailure {
  ads: AdItem[];
  error: true;
  message: string;
}

export type GetAdsResult = GetAdsSuccess | GetAdsFailure;

function mapCampaignToAdItem(campaign: AdCampaignResponse): AdItem {
  return {
    id: campaign.id,
    title: campaign.name,
    price: campaign.daily_budget,
    status: campaign.status,
  };
}

export async function getAds(): Promise<GetAdsResult> {
  try {
    const response = await request<ListAdCampaignsResponse>('/ad_campaigns', {
      method: 'GET',
    });

    return {
      ads: (response.data.campaigns ?? []).map(mapCampaignToAdItem),
    };
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: normalizeAdsErrorMessage(raw),
      ads: [],
    };
  }
}
