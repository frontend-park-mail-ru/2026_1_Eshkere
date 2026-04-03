import { request } from 'shared/lib/request';
import { normalizeAdsErrorMessage } from '../lib/normalize-ads-error';

export interface AdItem {
  id?: string | number;
  title?: string;
  price?: number;
  target_action?: string;
  created_at?: string;
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

interface AdsApiPayload {
  data?: {
    ads?: AdItem[];
  };
}

export async function getAds(): Promise<GetAdsResult> {
  try {
    const response = await request<AdsApiPayload>('/ads', {
      method: 'GET',
    });

    return {
      ads: response.data?.ads ?? [],
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
