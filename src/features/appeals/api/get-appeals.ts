import { request } from 'shared/lib/request';
import type { AppealResponse, ListAppealsResponse } from './contracts';

export interface GetAppealsSuccess {
  appeals: AppealResponse[];
  error?: false;
  message?: undefined;
}

export interface GetAppealsFailure {
  appeals: AppealResponse[];
  error: true;
  message: string;
}

export type GetAppealsResult = GetAppealsSuccess | GetAppealsFailure;

export async function getAppeals(): Promise<GetAppealsResult> {
  try {
    const response = await request<ListAppealsResponse>('/appeal', {
      method: 'GET',
    });

    return {
      appeals: response.data.appeals ?? [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: true,
      message: message || 'Не удалось загрузить обращения',
      appeals: [],
    };
  }
}
