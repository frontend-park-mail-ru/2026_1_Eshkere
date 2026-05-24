import { request } from 'shared/lib/request';

export interface DictionaryItem {
  code: string;
  name: string;
}

export interface BlockTypeDictionaryItem extends DictionaryItem {
  description: string;
  platforms: string[];
}

export interface GeoTreeNode {
  code: string;
  name: string;
  children?: GeoTreeNode[];
}

interface DictionaryResponse {
  items: DictionaryItem[];
}

interface BlockTypeDictionaryResponse {
  items: BlockTypeDictionaryItem[];
}

interface GeoTreeResponse {
  items: GeoTreeNode[];
}

interface RegionsResponse {
  country_code: string;
  items: DictionaryItem[];
}

export async function getPartnerCountries(): Promise<DictionaryItem[]> {
  const res = await request<DictionaryResponse>('/partners/dictionaries/countries');
  return res.data.items ?? [];
}

export async function getPartnerRegistrationRegions(countryCode: string): Promise<DictionaryItem[]> {
  const res = await request<RegionsResponse>(
    `/partners/dictionaries/registration-regions?country_code=${encodeURIComponent(countryCode)}`,
  );
  return res.data.items ?? [];
}

export async function getPartnerCooperationForms(): Promise<DictionaryItem[]> {
  const res = await request<DictionaryResponse>('/partners/dictionaries/cooperation-forms');
  return res.data.items ?? [];
}

export async function getPartnerPayoutCurrencies(): Promise<DictionaryItem[]> {
  const res = await request<DictionaryResponse>('/partners/dictionaries/payout-currencies');
  return res.data.items ?? [];
}

export async function getPartnerBlockTypes(): Promise<BlockTypeDictionaryItem[]> {
  const res = await request<BlockTypeDictionaryResponse>('/partners/dictionaries/block-types');
  return res.data.items ?? [];
}

export async function getPartnerGeoTree(): Promise<GeoTreeNode[]> {
  const res = await request<GeoTreeResponse>('/partners/dictionaries/geo-tree');
  return res.data.items ?? [];
}
