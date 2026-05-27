import { request } from 'shared/lib/request';
import type { DeliveryAlert } from '../model/types';

export interface GetBalanceResponse {
  balance: number;
  saved_payment_method_id?: string;
  saved_payment_method_title?: string;
  delivery_alert?: DeliveryAlert;
}

export async function getBalance(): Promise<GetBalanceResponse> {
  const response = await request<GetBalanceResponse>('/advertisers/balance');
  return response.data;
}
