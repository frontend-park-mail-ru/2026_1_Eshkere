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
