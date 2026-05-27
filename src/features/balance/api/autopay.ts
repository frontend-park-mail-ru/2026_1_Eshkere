import { request } from 'shared/lib/request';

export interface AutopaySettingsResponse {
  enabled: boolean;
  threshold: number;
  limit: number;
}

export async function getAutopaySettings(): Promise<AutopaySettingsResponse> {
  const response = await request<AutopaySettingsResponse>('/advertisers/balance/autopay');
  return response.data;
}

export async function updateAutopaySettings(
  settings: AutopaySettingsResponse,
): Promise<AutopaySettingsResponse> {
  const response = await request<AutopaySettingsResponse>('/advertisers/balance/autopay', {
    method: 'POST',
    body: settings,
  });
  return response.data;
}
