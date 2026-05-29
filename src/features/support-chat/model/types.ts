export type SupportMessageAuthor = 'advertiser' | 'moderator' | 'system';

/** Автор с точки зрения UI (user = advertiser). */
export type SupportChatUiAuthor = 'user' | 'moderator' | 'system';

export interface SupportThread {
  id: number;
  campaign_id: number;
}

export interface SupportMessage {
  id: number;
  thread_id: number;
  author: SupportMessageAuthor;
  text: string;
  created_at: string;
}

export interface SupportChatMessageView {
  id: number | string;
  author: SupportChatUiAuthor;
  text: string;
  time: string;
}

export interface SupportMessagePayload {
  id?: number;
  thread_id?: number;
  author?: SupportMessageAuthor;
  text?: string;
  created_at?: string;
}
