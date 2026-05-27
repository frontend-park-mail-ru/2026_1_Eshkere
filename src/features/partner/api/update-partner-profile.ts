import { request } from 'shared/lib/request';
import type { PartnerProfileDto } from './get-partner-profile';

export interface UpdatePartnerProfileParams {
  lastName?: string;
  firstName?: string;
  middleName?: string;
  birthDate?: string;
  phone?: string;
  countryCode?: string;
  registrationRegionCode?: string;
  cooperationForm?: string;
  payoutCurrency?: string;
}

export async function updatePartnerProfile(
  params: UpdatePartnerProfileParams,
): Promise<{ error: true; message: string } | PartnerProfileDto> {
  try {
    const body: Record<string, string | undefined> = {};
    if (params.lastName !== undefined) body['last_name'] = params.lastName;
    if (params.firstName !== undefined) body['first_name'] = params.firstName;
    if (params.middleName !== undefined) body['middle_name'] = params.middleName;
    if (params.birthDate !== undefined) body['birth_date'] = params.birthDate;
    if (params.phone !== undefined) body['phone'] = params.phone;
    if (params.countryCode !== undefined) body['country_code'] = params.countryCode;
    if (params.registrationRegionCode !== undefined)
      body['registration_region_code'] = params.registrationRegionCode;
    if (params.cooperationForm !== undefined) body['cooperation_form'] = params.cooperationForm;
    if (params.payoutCurrency !== undefined) body['payout_currency'] = params.payoutCurrency;

    const response = await request<PartnerProfileDto>('/partners/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return response.data;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Не удалось обновить профиль';
    return { error: true, message };
  }
}
