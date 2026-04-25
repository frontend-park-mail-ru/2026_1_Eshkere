import { request } from 'shared/lib/request';
import type { AppealResponse } from './contracts';

export async function getAppealById(appealId: number): Promise<AppealResponse> {
  const response = await request<AppealResponse>(`/appeal/${appealId}`, {
    method: 'GET',
  });
  return response.data;
}
