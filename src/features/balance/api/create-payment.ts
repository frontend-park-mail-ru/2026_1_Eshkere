import { request } from 'shared/lib/request';

export interface CreatePaymentResponse {
  payment_url: string;
}

export async function createPayment(
  amount: number,
): Promise<CreatePaymentResponse> {
  const response = await request<CreatePaymentResponse>(
    '/advertisers/balance/payment/create',
    {
      method: 'POST',
      body: { amount },
    },
  );

  return response.data;
}
