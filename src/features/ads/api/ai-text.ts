import { request } from 'shared/lib/request';

export type AdTextTone = 'professional' | 'friendly' | 'bold' | 'minimal';

export interface AdTextResult {
  headline: string;
  body: string;
}

export async function generateAdText(params: {
  product_description: string;
  tone: AdTextTone;
  headline_max_len: number;
  body_max_len: number;
  product_name?: string;
}): Promise<AdTextResult> {
  const res = await request<{ data: AdTextResult }>('/ai/ad-text', {
    method: 'POST',
    body: params,
  });
  return res.data.data;
}
