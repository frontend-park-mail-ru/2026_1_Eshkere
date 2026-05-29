import type { SupportChatMessageView } from 'features/support-chat';
import type { WsConnectionState } from 'shared/lib/websocket';

const CONNECTION_LABELS: Record<string, string> = {
  connecting: 'Подключение…',
  reconnecting: 'Переподключение…',
  open: 'Онлайн',
  closing: 'Отключение…',
  closed: 'Офлайн',
  idle: '',
  offline: 'Чат скоро будет доступен',
};

export function renderChatMessages(
  container: HTMLElement,
  messages: SupportChatMessageView[],
): void {
  container.innerHTML = messages
    .map(
      (message) => `
        <article class="support-message support-message--${message.author}" data-message-id="${message.id}">
          <span class="support-message__meta">${message.time}</span>
          <p class="support-message__text"></p>
        </article>
      `,
    )
    .join('');

  container.querySelectorAll<HTMLElement>('.support-message').forEach((node, index) => {
    const textEl = node.querySelector<HTMLElement>('.support-message__text');
    if (textEl) textEl.textContent = messages[index]?.text ?? '';
  });

  const last = container.lastElementChild;
  last?.scrollIntoView({ block: 'nearest' });
}

export function updateModeratorNote(thread: HTMLElement, text: string | null): void {
  const note = thread.querySelector<HTMLElement>('[data-support-moderator-note]');
  const noteText = thread.querySelector<HTMLElement>('[data-support-moderator-text]');
  if (!note || !noteText) return;

  if (!text?.trim()) {
    note.hidden = true;
    noteText.textContent = '';
    return;
  }

  note.hidden = false;
  noteText.textContent = text;
}

export function updateChatEmptyState(thread: HTMLElement, messages: SupportChatMessageView[]): void {
  const emptyEl = thread.querySelector<HTMLElement>('[data-support-chat-empty]');
  if (!emptyEl) return;
  emptyEl.hidden = messages.length > 0;
}

export function updateConnectionStatus(
  thread: HTMLElement,
  state: WsConnectionState | 'offline',
): void {
  const statusEl = thread.querySelector<HTMLElement>('[data-support-chat-status]');
  if (!statusEl) return;

  const label = CONNECTION_LABELS[state] ?? '';
  statusEl.textContent = label;
  statusEl.hidden = !label;

  statusEl.classList.remove(
    'support-thread__chat-status--live',
    'support-thread__chat-status--pending',
    'support-thread__chat-status--offline',
  );

  if (state === 'open') {
    statusEl.classList.add('support-thread__chat-status--live');
  } else if (state === 'connecting' || state === 'reconnecting') {
    statusEl.classList.add('support-thread__chat-status--pending');
  } else if (state === 'offline' || state === 'closed') {
    statusEl.classList.add('support-thread__chat-status--offline');
  }
}

export function getActiveCampaignThread(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-support-thread]:not([hidden])');
}

export function parseCampaignId(thread: HTMLElement | null): number | null {
  const raw = thread?.dataset.supportThread;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}
