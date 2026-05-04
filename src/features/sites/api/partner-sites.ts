import { request } from 'shared/lib/request';

export interface CreatePartnerSiteBody {
  domain: string;
  site_name: string;
}

export interface CreatePartnerSiteResponse {
  id: number;
}

export interface PartnerSiteDto {
  id: number;
  domain: string;
  site_name: string;
  /** Статус площадки: draft | pending_review | active | rejected | blocked | archived */
  status?: string;
  created_at: string;
  updated_at?: string;
}

export interface ListPartnerSitesResponse {
  partner_id: number;
  sites: PartnerSiteDto[];
}

export async function listPartnerSites(): Promise<ListPartnerSitesResponse> {
  const response = await request<ListPartnerSitesResponse>('/partners/sites');
  return response.data;
}

export async function getPartnerSite(siteId: number): Promise<PartnerSiteDto> {
  const response = await request<PartnerSiteDto>(`/partners/sites/${siteId}`);
  return response.data;
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

export async function deletePartnerSite(siteId: number): Promise<void> {
  await request(`/partners/sites/${siteId}`, { method: 'DELETE' });
}

export interface UpdatePartnerSiteBody {
  domain?: string;
  site_name?: string;
  status?: string;
}

export async function updatePartnerSite(
  siteId: number,
  body: UpdatePartnerSiteBody,
): Promise<PartnerSiteDto> {
  const response = await request<PartnerSiteDto>(`/partners/sites/${siteId}`, {
    method: 'PUT',
    body,
  });
  return response.data;
}
