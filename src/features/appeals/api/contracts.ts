export type AppealCategory = 'bug' | 'suggestion' | 'complaint' | 'question';

export interface AppealResponse {
  id: number;
  title: string;
  description: string;
  category: AppealCategory;
  status: string;
  image_url?: string;
  answer?: string;
  response?: string;
  reply?: string;
}

export interface ListAppealsResponse {
  advertiser_id: number;
  appeals: AppealResponse[];
}
