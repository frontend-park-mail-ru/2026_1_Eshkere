import { request } from 'shared/lib/request';
import { normalizeAuthErrorMessage } from 'features/auth/lib/normalize-auth-error';
import { authState } from 'entities/user';

export interface RegisterPartnerParams {
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
  email: string;
  phone: string;
  countryCode: string;
  registrationRegionCode: string;
  cooperationForm: 'self_employed' | 'individual_entrepreneur' | 'legal_entity';
  payoutCurrency: 'RUB' | 'USD' | 'EUR';
  password: string;
}

interface PartnerRegisterResponse {
  id: number;
  email: string;
  phone: string;
}

export async function registerPartner(params: RegisterPartnerParams) {
  try {
    const response = await request<PartnerRegisterResponse>('/partners/register', {
      method: 'POST',
      body: {
        last_name: params.lastName.trim(),
        first_name: params.firstName.trim(),
        middle_name: params.middleName?.trim() ?? '',
        birth_date: params.birthDate,
        email: params.email.trim().toLowerCase(),
        phone: params.phone.trim(),
        country_code: params.countryCode,
        registration_region_code: params.registrationRegionCode,
        cooperation_form: params.cooperationForm,
        payout_currency: params.payoutCurrency,
        password: params.password,
      },
    });

    authState.setAuthenticatedUser({
      ...response.data,
      name: `${params.firstName} ${params.lastName}`.trim(),
      userType: 'partner',
    });

    return { user: authState.getCurrentUser()! };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: true, message: normalizeAuthErrorMessage(msg) };
  }
}
