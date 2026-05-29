import {
  getThreadByCampaign,
  listThreadMessages,
  sendThreadMessage,
  SUPPORT_CHAT_WS_PATH,
} from '../api/support';
import type { SupportChatMessageView, SupportMessagePayload } from '../model/types';
import { findLastModeratorMessage, formatMessageTime, toChatMessageView } from './format';
import { createWsClient, type WsClient, type WsConnectionState } from 'shared/lib/websocket';

export interface CampaignChatCallbacks {
  onMessagesChange?: (messages: SupportChatMessageView[]) => void;
  onModeratorNote?: (text: string | null) => void;
  onConnectionState?: (state: WsConnectionState | 'offline') => void;
  onSendError?: () => void;
}

/**
 * Чат одной кампании: REST-история + WebSocket для live-сообщений.
 * Активен только один экземпляр на странице (переключение кампании).
 */
export class CampaignChatSession {
  private readonly campaignId: number;

  private threadId: number | null = null;

  private ws: WsClient | null = null;

  private messages: SupportChatMessageView[] = [];

  private readonly knownIds = new Set<number>();

  private readonly callbacks: CampaignChatCallbacks;

  constructor(campaignId: number, callbacks: CampaignChatCallbacks = {}) {
    this.campaignId = campaignId;
    this.callbacks = callbacks;
  }

  getCampaignId(): number {
    return this.campaignId;
  }

  getThreadId(): number | null {
    return this.threadId;
  }

  getMessages(): SupportChatMessageView[] {
    return [...this.messages];
  }

  async load(): Promise<void> {
    this.callbacks.onConnectionState?.('connecting');

    const thread = await getThreadByCampaign(this.campaignId);
    if (!thread) {
      this.threadId = null;
      this.messages = [];
      this.knownIds.clear();
      this.callbacks.onMessagesChange?.([]);
      this.callbacks.onModeratorNote?.(null);
      this.callbacks.onConnectionState?.('offline');
      return;
    }

    this.threadId = thread.id;
    const rawMessages = await listThreadMessages(thread.id);
    this.messages = rawMessages.map(toChatMessageView);
    this.knownIds.clear();
    rawMessages.forEach((m) => this.knownIds.add(m.id));

    this.callbacks.onMessagesChange?.(this.getMessages());
    this.callbacks.onModeratorNote?.(findLastModeratorMessage(rawMessages)?.text ?? null);

    this.connectWs();
  }

  async send(text: string): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const tempId = `temp-${Date.now()}`;
    const optimistic: SupportChatMessageView = {
      id: tempId,
      author: 'user',
      text: trimmed,
      time: formatMessageTime(new Date().toISOString()),
    };

    this.messages = [...this.messages, optimistic];
    this.callbacks.onMessagesChange?.(this.getMessages());

    if (this.ws?.isOpen()) {
      this.ws.send({ type: 'send', payload: { text: trimmed } });
      return true;
    }

    if (this.threadId === null) {
      this.callbacks.onSendError?.();
      this.messages = this.messages.filter((m) => m.id !== tempId);
      this.callbacks.onMessagesChange?.(this.getMessages());
      return false;
    }

    const saved = await sendThreadMessage(this.threadId, trimmed);
    if (!saved) {
      this.callbacks.onSendError?.();
      this.messages = this.messages.filter((m) => m.id !== tempId);
      this.callbacks.onMessagesChange?.(this.getMessages());
      return false;
    }

    this.messages = this.messages
      .filter((m) => m.id !== tempId)
      .concat(toChatMessageView(saved));
    this.knownIds.add(saved.id);
    this.callbacks.onMessagesChange?.(this.getMessages());
    return true;
  }

  destroy(): void {
    this.ws?.destroy();
    this.ws = null;
  }

  private connectWs(): void {
    this.ws?.destroy();

    if (this.threadId === null) {
      return;
    }

    const threadId = this.threadId;

    this.ws = createWsClient({
      path: SUPPORT_CHAT_WS_PATH,
      query: { thread_id: threadId },
      onStateChange: (state) => {
        this.callbacks.onConnectionState?.(state);
      },
      onMessage: (envelope) => {
        if (envelope.type === 'message') {
          this.handleIncomingMessage(envelope.payload as SupportMessagePayload | undefined);
          return;
        }

        if (envelope.type === 'ack' && envelope.payload) {
          const payload = envelope.payload as SupportMessagePayload;
          if (payload.id && payload.text) {
            this.handleIncomingMessage(payload);
          }
        }
      },
    });

    this.ws.connect();
  }

  private handleIncomingMessage(payload: SupportMessagePayload | undefined): void {
    if (!payload?.text) return;

    const id = payload.id;
    if (typeof id === 'number' && this.knownIds.has(id)) {
      return;
    }

    const author = payload.author ?? 'moderator';
    const view: SupportChatMessageView = {
      id: id ?? `ws-${Date.now()}`,
      author: author === 'advertiser' ? 'user' : author,
      text: payload.text,
      time: payload.created_at ? formatMessageTime(payload.created_at) : formatMessageTime(new Date().toISOString()),
    };

    if (typeof id === 'number') {
      this.knownIds.add(id);
      this.messages = this.messages.filter((m) => typeof m.id !== 'string' || !String(m.id).startsWith('temp-'));
    }

    this.messages = [...this.messages, view];
    this.callbacks.onMessagesChange?.(this.getMessages());

    if (author === 'moderator' || author === 'system') {
      this.callbacks.onModeratorNote?.(payload.text);
    }
  }
}

export class CampaignChatCoordinator {
  private active: CampaignChatSession | null = null;

  async switchTo(
    campaignId: number,
    callbacks: CampaignChatCallbacks,
  ): Promise<CampaignChatSession> {
    if (this.active?.getCampaignId() === campaignId) {
      return this.active;
    }

    this.active?.destroy();
    this.active = new CampaignChatSession(campaignId, callbacks);
    await this.active.load();
    return this.active;
  }

  getActive(): CampaignChatSession | null {
    return this.active;
  }

  destroy(): void {
    this.active?.destroy();
    this.active = null;
  }
}
