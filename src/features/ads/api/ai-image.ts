import { request } from 'shared/lib/request';

export type AiImageStyle  = 'clean' | 'bold' | 'minimal';
export type AiImageFormat = 'feed' | 'stories';

export interface AiImageResult {
  image_url: string;
}

export async function generateAdImage(params: {
  prompt:          string;
  style:           AiImageStyle;
  format:          AiImageFormat;
  generation_key:  string;
}): Promise<AiImageResult> {
  const res = await request<{ images: AiImageResult[] }>('/ai/ad-image', {
    method: 'POST',
    body: params,
  });
  const first = res.data.images?.[0];
  if (!first) throw new Error('empty');
  return first;
}
