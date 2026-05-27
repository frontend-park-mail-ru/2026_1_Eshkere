import { request } from 'shared/lib/request';
import type { DeliveryAlert } from '../model/types';

export interface TopUpResponse {
  balance: number;
  delivery_alert?: DeliveryAlert;
}

export async function topUpBalance(amount: number): Promise<TopUpResponse> {
  const response = await request<TopUpResponse>('/advertisers/balance/topup', {
    method: 'POST',
    body: { amount },
  });

  return response.data;
}
