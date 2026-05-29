import { request } from 'shared/lib/request';

export interface SubscriptionResponse {
  tariff:         'basic' | 'pro' | 'business';
  is_pro_active:  boolean;
  expires_at:     string | null;
  max_campaigns:  number;
  used_campaigns: number;
  price_rub:      number;
}

export async function getSubscription(): Promise<SubscriptionResponse> {
  const res = await request<{ data: SubscriptionResponse }>('/subscription', { method: 'GET' });
  return res.data.data;
}

// Активирует Pro за счёт баланса. Возвращает обновлённую подписку.
// Бросает ApiRequestError(402) если на балансе меньше 3 900 ₽.
export async function activateProFromBalance(): Promise<SubscriptionResponse> {
  const res = await request<{ data: SubscriptionResponse }>('/subscription', { method: 'POST' });
  return res.data.data;
}
