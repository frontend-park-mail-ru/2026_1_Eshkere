import { request } from 'shared/lib/request';
import { SUPPORT_CHAT_WS_PATH } from './support';
import { sendOnceViaWs } from '../lib/ws-send-once';
import type { SupportThread } from '../model/types';

interface ThreadByAdResponse {
  thread: SupportThread;
}

interface SendMessageResponse {
  message: unknown;
}

export async function getAdminThreadByAd(adId: number): Promise<SupportThread | null> {
  try {
    const response = await request<ThreadByAdResponse>(
      `/admin/support/threads/by-ad/${adId}`,
    );
    return response.data.thread ?? null;
  } catch {
    return null;
  }
}

export async function sendAdminThreadMessage(threadId: number, text: string): Promise<boolean> {
  try {
    await request<SendMessageResponse>(`/admin/support/threads/${threadId}/messages`, {
      method: 'POST',
      body: { text },
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendModeratorSupportMessage(adId: number, text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const thread = await getAdminThreadByAd(adId);
  if (!thread) {
    return false;
  }

  try {
    await sendOnceViaWs({
      path: SUPPORT_CHAT_WS_PATH,
      query: { thread_id: thread.id },
      envelope: {
        type: 'send',
        payload: { text: trimmed },
      },
    });
    return true;
  } catch {
    return sendAdminThreadMessage(thread.id, trimmed);
  }
}
