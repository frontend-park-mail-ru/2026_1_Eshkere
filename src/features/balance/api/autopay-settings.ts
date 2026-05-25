import { request } from 'shared/lib/request';

export interface AutopaySettingsResponse {
  enabled: boolean;
  threshold: number;
  limit: number;
}

export interface UpdateAutopaySettingsPayload {
  enabled: boolean;
  threshold: number;
  limit: number;
}

export async function getAutopaySettings(): Promise<AutopaySettingsResponse> {
  const response = await request<AutopaySettingsResponse>(
    '/advertisers/balance/autopay',
  );

  return response.data;
}

export async function updateAutopaySettings(
  payload: UpdateAutopaySettingsPayload,
): Promise<AutopaySettingsResponse> {
  const response = await request<AutopaySettingsResponse>(
    '/advertisers/balance/autopay',
    {
      method: 'POST',
      body: payload,
    },
  );

  return response.data;
}
