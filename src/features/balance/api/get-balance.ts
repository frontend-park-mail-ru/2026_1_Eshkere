import { request } from 'shared/lib/request';

export interface GetBalanceResponse {
  balance: number;
}

export async function getBalance(): Promise<GetBalanceResponse> {
  const response = await request<GetBalanceResponse>('/advertisers/balance');
  return response.data;
}
