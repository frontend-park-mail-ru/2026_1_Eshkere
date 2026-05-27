import './moderator-appeals.scss';
import { navigateTo } from 'shared/lib/navigation';
import { moderationAppeals } from 'features/moderation/model/mock';
import { renderTemplate } from 'shared/lib/render';
import { renderButton } from 'shared/ui/button/button';
import template from './moderator-appeals.hbs';

function getStatusKey(status: string): 'new' | 'pending' {
  if (status === 'Новая апелляция') return 'new';
  return 'pending';
}

function getStatusTone(statusKey: 'new' | 'pending'): string {
  if (statusKey === 'new') return 'new';
  return 'pending';
}

export async function renderModeratorAppealsPage(): Promise<string> {
  const items = await Promise.all(moderationAppeals.map(async (item) => {
    const statusKey = getStatusKey(item.status);
    const openCaseButton = await renderButton({
      text: 'Открыть кейс',
      type: 'button',
      variant: 'secondary',
      className: 'moderator-appeal-card__open',
    });
    return { ...item, statusKey, statusTone: getStatusTone(statusKey), openCaseButton };
  }));

  const newCount = items.filter((i) => i.statusKey === 'new').length;
  const pendingCount = items.filter((i) => i.statusKey === 'pending').length;

  return renderTemplate(template, {
    items,
    stats: { newCount, pendingCount, totalCount: items.length },
  });
}

export function ModeratorAppealsPage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.moderator-appeals-page');
  if (!root) return () => {};

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-appeal-id]'));
  const searchInput = root.querySelector<HTMLInputElement>('[data-appeals-search]');
  const statusFilter = root.querySelector<HTMLSelectElement>('[data-appeals-status-filter]');
  const emptyState = root.querySelector<HTMLElement>('[data-appeals-empty]');

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

  root.addEventListener('click', (event) => {
    const targetNode = (event.target as HTMLElement).closest<HTMLElement>('[data-appeal-open-case]');
    if (!targetNode) return;
    const caseId = targetNode.dataset.appealOpenCase;
    if (caseId) navigateTo(`/moderator/case?id=${encodeURIComponent(caseId)}`);
  });

  renderState();
  return () => {};
}
