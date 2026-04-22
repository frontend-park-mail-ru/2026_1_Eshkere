import './moderator-messages.scss';
import { moderationInbox } from 'features/moderation/model/mock';
import { renderTemplate } from 'shared/lib/render';
import template from './moderator-messages.hbs';

function getStatusKey(status: string): 'reply' | 'active' {
  if (status === 'Требует ответа') return 'reply';
  return 'active';
}

function getStatusTone(statusKey: 'reply' | 'active'): string {
  if (statusKey === 'reply') return 'urgent';
  return 'active';
}

export async function renderModeratorMessagesPage(): Promise<string> {
  const items = moderationInbox.map((item) => {
    const statusKey = getStatusKey(item.status);
    return {
      ...item,
      statusKey,
      statusTone: getStatusTone(statusKey),
      isRequiresReply: statusKey === 'reply',
    };
  });

  return renderTemplate(template, {
    items,
    stats: {
      requiresReply: items.filter((i) => i.statusKey === 'reply').length,
      inProgress: items.filter((i) => i.statusKey === 'active').length,
    },
  });
}

export function ModeratorMessagesPage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.moderator-messages-page');
  if (!root) return () => {};

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-thread-id]'));
  const searchInput = root.querySelector<HTMLInputElement>('[data-messages-search]');
  const statusFilter = root.querySelector<HTMLSelectElement>('[data-messages-status-filter]');
  const emptyState = root.querySelector<HTMLElement>('[data-messages-empty]');

  const renderState = (): void => {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    const status = statusFilter?.value ?? 'all';
    let visibleCount = 0;

    cards.forEach((card) => {
      const searchable = (card.dataset.searchable ?? '').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesStatus = status === 'all' || card.dataset.statusKey === status;
      const visible = matchesQuery && matchesStatus;
      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  };

  searchInput?.addEventListener('input', renderState);
  statusFilter?.addEventListener('change', renderState);

  renderState();
  return () => {};
}
