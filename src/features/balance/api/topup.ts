import { request } from 'shared/lib/request';

export interface TopUpResponse {
  balance: number;
}

export async function topUpBalance(amount: number): Promise<TopUpResponse> {
  const response = await request<TopUpResponse>('/advertiser/balance/topup', {
    method: 'POST',
    body: { amount },
  });

  return response.data;
}
