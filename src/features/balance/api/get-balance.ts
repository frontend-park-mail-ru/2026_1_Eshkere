import { request } from 'shared/lib/request';
import type { DeliveryAlert } from '../model/types';

export interface GetBalanceResponse {
  balance: number;
  delivery_alert?: DeliveryAlert;
}

export async function getBalance(): Promise<GetBalanceResponse> {
  const response = await request<GetBalanceResponse>('/advertisers/balance');
  return response.data;
}
