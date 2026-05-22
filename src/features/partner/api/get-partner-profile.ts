import { request } from 'shared/lib/request';

export interface PartnerProfileDto {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  birth_date: string;
  email: string;
  phone: string;
  country_code: string;
  registration_region_code: string;
  cooperation_form: string;
  payout_currency: string;
  balance: number;
  created_at: string;
}

export async function getPartnerProfile(): Promise<PartnerProfileDto> {
  const response = await request<PartnerProfileDto>('/partners/me');
  return response.data;
}
