import { request } from 'shared/lib/request';

export interface CreatePartnerSiteBody {
  domain: string;
  site_name: string;
}

export interface CreatePartnerSiteResponse {
  id: number;
}

export async function createPartnerSite(
  body: CreatePartnerSiteBody,
): Promise<CreatePartnerSiteResponse> {
  const response = await request<CreatePartnerSiteResponse>('/partners/sites', {
    method: 'POST',
    body,
  });
  return response.data;
}
