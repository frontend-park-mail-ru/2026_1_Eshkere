import { request } from 'shared/lib/request';
import type { SupportMessage, SupportThread } from '../model/types';

export const SUPPORT_CHAT_WS_PATH = '/ws/support';

interface ThreadByCampaignResponse {
  thread: SupportThread;
}

interface ListMessagesResponse {
  messages: SupportMessage[];
}

interface SendMessageResponse {
  message: SupportMessage;
}

export async function getThreadByCampaign(campaignId: number): Promise<SupportThread | null> {
  try {
    const response = await request<ThreadByCampaignResponse>(
      `/support/threads/by-campaign/${campaignId}`,
    );
    return response.data.thread ?? null;
  } catch {
    return null;
  }
}

export async function listThreadMessages(threadId: number): Promise<SupportMessage[]> {
  try {
    const response = await request<ListMessagesResponse>(
      `/support/threads/${threadId}/messages`,
    );
    return response.data.messages ?? [];
  } catch {
    return [];
  }
}

export async function sendThreadMessage(threadId: number, text: string): Promise<SupportMessage | null> {
  try {
    const response = await request<SendMessageResponse>(
      `/support/threads/${threadId}/messages`,
      {
        method: 'POST',
        body: { text },
      },
    );
    return response.data.message ?? null;
  } catch {
    return null;
  }
}
