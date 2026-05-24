import { request } from 'shared/lib/request';
import type { PartnerBlockStatus } from '../model/partner-block-status';

export interface CreatePartnerBlockBody {
  block_type: string;
  name: string;
}

export interface CreatePartnerBlockResponse {
  id: number;
  site_id: number;
  name: string;
  block_type: string;
  status: string;
}

export interface PartnerBlockEmbedDto {
  embed_token: string;
  html_snippet: string;
  script_url?: string;
}

export interface PartnerBlockListItemDto {
  id: number;
  name: string;
  block_type: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface ListPartnerBlocksResponse {
  site_id: number;
  blocks: PartnerBlockListItemDto[];
}

export async function listPartnerBlocks(
  siteId: number,
): Promise<ListPartnerBlocksResponse> {
  const response = await request<ListPartnerBlocksResponse>(
    `/partners/sites/${siteId}/blocks`,
  );
  return response.data;
}

export async function createPartnerBlock(
  siteId: number,
  body: CreatePartnerBlockBody,
): Promise<CreatePartnerBlockResponse> {
  const response = await request<CreatePartnerBlockResponse>(
    `/partners/sites/${siteId}/blocks`,
    {
      method: 'POST',
      body,
    },
  );
  return response.data;
}

export async function getPartnerBlockEmbed(
  siteId: number,
  blockId: number,
): Promise<PartnerBlockEmbedDto> {
  const response = await request<PartnerBlockEmbedDto>(
    `/partners/sites/${siteId}/blocks/${blockId}/embed`,
  );
  return response.data;
}

export async function deletePartnerBlock(
  siteId: number,
  blockId: number,
): Promise<void> {
  await request(`/partners/sites/${siteId}/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

export interface UpdatePartnerBlockMetaBody {
  name?: string;
  status?: PartnerBlockStatus;
}

export interface UpdatePartnerBlockMetaResponse {
  id: number;
  name: string;
  block_type: string;
  status: string;
}

export interface PartnerBlockDetailsDto {
  id: number;
  site_id: number;
  name: string;
  block_type: string;
  status: string;
  supported_platforms: string[];
  general_settings: {
    cpm_strategy: string;
    amp_mode: string;
    size_mode: string;
    border_mode: string;
    corner_mode: string;
    theme: string;
    interscroller_mode: string;
    interscroller_background_color?: string | null;
    revenue_share_bps: number;
  };
  geography_settings: {
    only_configured: boolean;
    global_cpmv?: number | null;
    rules: Array<{ geo_code: string; is_enabled: boolean; cpmv?: number | null }>;
  };
  self_ad_settings: { reserved: boolean };
  created_at: string;
  updated_at?: string;
}

export async function getPartnerBlock(
  siteId: number,
  blockId: number,
): Promise<PartnerBlockDetailsDto> {
  const response = await request<PartnerBlockDetailsDto>(
    `/partners/sites/${siteId}/blocks/${blockId}`,
  );
  return response.data;
}

export interface UpdatePartnerBlockGeneralBody {
  cpm_strategy?: string;
  amp_mode?: string;
  size_mode?: string;
  border_mode?: string;
  corner_mode?: string;
  theme?: string;
  interscroller_mode?: string;
  interscroller_background_color?: string;
  revenue_share_bps?: number;
}

export async function updatePartnerBlockGeneral(
  siteId: number,
  blockId: number,
  body: UpdatePartnerBlockGeneralBody,
): Promise<void> {
  await request(`/partners/sites/${siteId}/blocks/${blockId}/general`, {
    method: 'PUT',
    body,
  });
}

export interface GeoRule {
  geo_code: string;
  is_enabled: boolean;
  cpmv?: number | null;
}

export interface UpdatePartnerBlockGeographyBody {
  only_configured: boolean;
  global_cpmv?: number | null;
  rules: GeoRule[];
}

export async function updatePartnerBlockGeography(
  siteId: number,
  blockId: number,
  body: UpdatePartnerBlockGeographyBody,
): Promise<void> {
  await request(`/partners/sites/${siteId}/blocks/${blockId}/geography`, {
    method: 'PUT',
    body,
  });
}

export async function updatePartnerBlockSelfAd(
  siteId: number,
  blockId: number,
  reserved: boolean,
): Promise<void> {
  await request(`/partners/sites/${siteId}/blocks/${blockId}/self-ad`, {
    method: 'PUT',
    body: { reserved },
  });
}

export async function updatePartnerBlockMeta(
  siteId: number,
  blockId: number,
  body: UpdatePartnerBlockMetaBody,
): Promise<UpdatePartnerBlockMetaResponse> {
  const response = await request<UpdatePartnerBlockMetaResponse>(
    `/partners/sites/${siteId}/blocks/${blockId}/meta`,
    {
      method: 'PUT',
      body,
    },
  );
  return response.data;
}
