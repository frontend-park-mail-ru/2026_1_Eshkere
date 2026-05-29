import { request } from 'shared/lib/request';

export type AiImageStyle  = 'clean' | 'bold' | 'minimal';
export type AiImageFormat = 'feed' | 'stories';

export interface AiImageResult {
  image_url: string;
}

export async function generateAdImages(params: {
  prompt:  string;
  style:   AiImageStyle;
  format:  AiImageFormat;
  count:   number;
}): Promise<AiImageResult[]> {
  const res = await request<{ images: AiImageResult[] }>('/ai/ad-image', {
    method: 'POST',
    body: params,
  });
  return res.data.images;
}
