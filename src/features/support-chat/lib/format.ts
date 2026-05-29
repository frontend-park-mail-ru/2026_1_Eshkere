import type { SupportChatMessageView, SupportMessage, SupportMessageAuthor } from '../model/types';

export function mapAuthorToUi(author: SupportMessageAuthor): SupportChatMessageView['author'] {
  if (author === 'advertiser') return 'user';
  return author;
}

export function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function toChatMessageView(message: SupportMessage): SupportChatMessageView {
  return {
    id: message.id,
    author: mapAuthorToUi(message.author),
    text: message.text,
    time: formatMessageTime(message.created_at),
  };
}

export function findLastModeratorMessage(messages: SupportMessage[]): SupportMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.author === 'moderator' || msg.author === 'system') {
      return msg;
    }
  }
  return null;
}
