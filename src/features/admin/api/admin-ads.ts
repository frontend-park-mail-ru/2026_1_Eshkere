import { request } from 'shared/lib/request';

export interface AdminAdDto {
  id: number;
  status: string;
  title: string;
  short_desc: string;
  image_url: string;
  target_url: string;
}

export async function listAdminAds(): Promise<AdminAdDto[]> {
  const res = await request<{ ads: AdminAdDto[] }>('/admin/ads');
  return res.data.ads ?? [];
}

export async function getAdminAd(adId: number): Promise<AdminAdDto> {
  const res = await request<AdminAdDto>(`/admin/ads/${adId}`);
  return res.data;
}

export async function updateAdModerationStatus(
  adId: number,
  status: 'approve' | 'disapprove',
): Promise<void> {
  await request<unknown>(`/admin/ads/${adId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { status },
  });
}
