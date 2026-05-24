import './moderator-queue.scss';
import { navigateTo } from 'shared/lib/navigation';
import { listAdminAds, type AdminAdDto } from 'features/admin';
import { renderTemplate } from 'shared/lib/render';
import queueTemplate from './moderator-queue.hbs';

const MODERATOR_QUEUE_PAGE_SIZE = 3;

function mapAdToQueueItem(ad: AdminAdDto) {
  return {
    id: String(ad.id),
    title: ad.title,
    advertiser: '—',
    platform: '—',
    stage: 'incoming' as const,
    priority: 'medium' as const,
    slaMinutes: 60,
    reason: ad.short_desc,
    tags: [] as string[],
    createdAt: '—',
    assignedTo: '—',
    summary: ad.short_desc,
    objectType: 'Объявление',
    actionLabel: 'Проверить и вынести решение по объявлению.',
    stageLabel: 'Новый кейс',
    stageTone: 'incoming' as const,
    priorityLabel: 'Средний',
    slaTone: 'normal' as const,
    queueAgeLabel: '—',
    tagsLabel: '',
    isCritical: false,
    isHigh: false,
    isMedium: true,
  };
}

export async function renderModeratorQueuePage(): Promise<string> {
  try {
    const ads = await listAdminAds();
    const items = ads.map(mapAdToQueueItem);

    return renderTemplate(queueTemplate, {
      priorityItems: items,
      stats: {
        incoming: items.length,
        review: 0,
        overdue: 0,
      },
    });
  } catch {
    return renderTemplate(queueTemplate, {
      priorityItems: [],
      stats: { incoming: 0, review: 0, overdue: 0 },
      loadError: 'Не удалось загрузить очередь модерации.',
    });
  }
}

export function ModeratorQueuePage(): VoidFunction {
  const root = document.querySelector('.moderator-queue-page');

  if (!(root instanceof HTMLElement)) {
    return () => {};
  }

  const cards = Array.from(root.querySelectorAll<HTMLElement>('.moderator-work-item'));
  const searchInput = root.querySelector<HTMLInputElement>('[data-moderator-queue-search]');
  const stageFilter = root.querySelector<HTMLSelectElement>('[data-moderator-stage-filter]');
  const priorityFilter = root.querySelector<HTMLSelectElement>('[data-moderator-priority-filter]');
  const emptyState = root.querySelector<HTMLElement>('[data-moderator-queue-empty]');
  const pagination = root.querySelector<HTMLElement>('[data-moderator-queue-pagination]');
  const prevButton = root.querySelector<HTMLButtonElement>('[data-pagination-prev]');
  const nextButton = root.querySelector<HTMLButtonElement>('[data-pagination-next]');
  const pagesSlot = root.querySelector<HTMLElement>('[data-pagination-pages]');
  let currentPage = 1;

  const getFilteredCards = (): HTMLElement[] => {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    const stage = stageFilter?.value ?? 'all';
    const priority = priorityFilter?.value ?? 'all';

    return cards.filter((card) => {
      const searchable = (card.dataset.searchable ?? '').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesStage = stage === 'all' || card.dataset.stage === stage;
      const matchesPriority = priority === 'all' || card.dataset.priority === priority;

      return matchesQuery && matchesStage && matchesPriority;
    });
  };

  const buildPaginationButton = (page: number, isActive: boolean): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `moderator-queue-pagination__page${isActive ? ' is-active' : ''}`;
    button.textContent = String(page);
    button.addEventListener('click', () => {
      currentPage = page;
      renderQueueState();
    });
    return button;
  };

  const renderQueueState = (): void => {
    const filteredCards = getFilteredCards();
    const totalPages = Math.max(1, Math.ceil(filteredCards.length / MODERATOR_QUEUE_PAGE_SIZE));

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const start = (currentPage - 1) * MODERATOR_QUEUE_PAGE_SIZE;
    const visibleCards = new Set(filteredCards.slice(start, start + MODERATOR_QUEUE_PAGE_SIZE));

    cards.forEach((card) => {
      card.hidden = !visibleCards.has(card);
    });

    if (emptyState) {
      emptyState.hidden = filteredCards.length > 0;
    }

    if (pagination) {
      pagination.hidden = filteredCards.length <= MODERATOR_QUEUE_PAGE_SIZE;
    }

    if (prevButton) {
      prevButton.disabled = currentPage <= 1;
    }

    if (nextButton) {
      nextButton.disabled = currentPage >= totalPages;
    }

    if (pagesSlot) {
      pagesSlot.innerHTML = '';

      for (let page = 1; page <= totalPages; page += 1) {
        pagesSlot.append(buildPaginationButton(page, page === currentPage));
      }
    }
  };

  const resetToFirstPage = (): void => {
    currentPage = 1;
    renderQueueState();
  };

  searchInput?.addEventListener('input', resetToFirstPage);
  stageFilter?.addEventListener('change', resetToFirstPage);
  priorityFilter?.addEventListener('change', resetToFirstPage);

  prevButton?.addEventListener('click', () => {
    currentPage = Math.max(1, currentPage - 1);
    renderQueueState();
  });

  nextButton?.addEventListener('click', () => {
    const filteredCards = getFilteredCards();
    const totalPages = Math.max(1, Math.ceil(filteredCards.length / MODERATOR_QUEUE_PAGE_SIZE));
    currentPage = Math.min(totalPages, currentPage + 1);
    renderQueueState();
  });

  root.querySelectorAll<HTMLElement>('[data-open-moderation-case]').forEach((card) => {
    card.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest('[data-toggle-case-details]')) {
        const details = card.querySelector<HTMLElement>('.moderator-work-item__details');
        const toggle = card.querySelector<HTMLButtonElement>('[data-toggle-case-details]');

        if (!details || !toggle) {
          return;
        }

        const shouldOpen = details.hasAttribute('hidden');
        details.hidden = !shouldOpen;
        card.classList.toggle('is-expanded', shouldOpen);
        toggle.textContent = shouldOpen ? 'Скрыть детали' : 'Подробнее';
        return;
      }

      const caseId = card.dataset.openModerationCase;
      if (!caseId) {
        return;
      }

      navigateTo(`/moderator/case?id=${encodeURIComponent(caseId)}`);
    });
  });

  renderQueueState();

  return () => {};
}
