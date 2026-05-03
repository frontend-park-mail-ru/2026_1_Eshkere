import { request } from 'shared/lib/request';

export interface AppealResponse {
  id: number;
  status: string;
  category: string;
  title: string;
  description: string;
  image_url?: string;
  created_at: string;
}

export interface ListAppealsResponse {
  advertiser_id: number;
  appeals: AppealResponse[];
}

export interface CreateAppealResponse {
  id: number;
}

export type AppealCategory = 'bug' | 'suggestion' | 'complaint' | 'question';

export interface CreateAppealParams {
  category: AppealCategory;
  title: string;
  description: string;
  name: string;
  email: string;
  screenshot?: File;
}

export async function listAppeals(): Promise<ListAppealsResponse> {
  const response = await request<ListAppealsResponse>('/appeals');
  return response.data;
}

export async function getAppeal(id: number): Promise<AppealResponse> {
  const response = await request<AppealResponse>(`/appeals/${id}`);
  return response.data;
}

export async function createAppeal(params: CreateAppealParams): Promise<CreateAppealResponse> {
  const body = new FormData();
  body.append('category', params.category);
  body.append('title', params.title.slice(0, 100));
  body.append('description', params.description);
  body.append('name', params.name);
  body.append('email', params.email);
  if (params.screenshot) {
    body.append('screenshot', params.screenshot);
  }

  const response = await request<CreateAppealResponse>('/appeals', {
    method: 'POST',
    body,
  });
  return response.data;
}
