import './moderator-queue.scss';
import { navigateTo } from 'app/navigation';
import { moderationQueue } from 'features/moderation/model/mock';
import { renderTemplate } from 'shared/lib/render';
import queueTemplate from './moderator-queue.hbs';

const MODERATOR_QUEUE_PAGE_SIZE = 3;

function getObjectTypeLabel(type: string): string {
  if (type === 'campaign') {
    return 'Кампания';
  }

  if (type === 'creative') {
    return 'Креатив';
  }

  if (type === 'landing') {
    return 'Лендинг';
  }

  if (type === 'account') {
    return 'Аккаунт';
  }

  return 'Документ';
}

function getStageLabel(stage: string): string {
  if (stage === 'incoming') {
    return 'Новый кейс';
  }

  if (stage === 'review') {
    return 'Идет проверка';
  }

  if (stage === 'decision') {
    return 'Нужно решение';
  }

  return 'Требует эскалации';
}

function getStageTone(stage: string): 'incoming' | 'review' | 'decision' | 'escalation' {
  if (stage === 'incoming') {
    return 'incoming';
  }

  if (stage === 'review') {
    return 'review';
  }

  if (stage === 'decision') {
    return 'decision';
  }

  return 'escalation';
}

function getPriorityLabel(priority: string): string {
  if (priority === 'critical') {
    return 'Критично';
  }

  if (priority === 'high') {
    return 'Высокий';
  }

  return 'Средний';
}

function getSlaTone(slaMinutes: number): 'danger' | 'warning' | 'normal' {
  if (slaMinutes <= 6) {
    return 'danger';
  }

  if (slaMinutes <= 12) {
    return 'warning';
  }

  return 'normal';
}

function getActionLabel(item: (typeof moderationQueue)[number]): string {
  if (item.stage === 'incoming') {
    return 'Проверить риск и взять кейс в ручную проверку.';
  }

  if (item.stage === 'review') {
    return 'Сверить материалы и обещание с фактическим оффером.';
  }

  if (item.stage === 'decision') {
    return 'Зафиксировать решение и подготовить ответ клиенту.';
  }

  return 'Передать кейс на старший review или в смежную команду.';
}

function getQueueAgeLabel(createdAt: string): string {
  const value = createdAt.trim();

  if (value.includes('мин')) {
    return `${value} в очереди`;
  }

  if (value.includes('час')) {
    return `${value} в очереди`;
  }

  return `Поступил: ${value}`;
}

export async function renderModeratorQueuePage(): Promise<string> {
  const items = moderationQueue.map((item) => ({
    ...item,
    objectType: getObjectTypeLabel(item.type),
    actionLabel: getActionLabel(item),
    stageLabel: getStageLabel(item.stage),
    stageTone: getStageTone(item.stage),
    priorityLabel: getPriorityLabel(item.priority),
    slaTone: getSlaTone(item.slaMinutes),
    queueAgeLabel: getQueueAgeLabel(item.createdAt),
    tagsLabel: item.tags.join(', '),
    isCritical: item.priority === 'critical',
    isHigh: item.priority === 'high',
    isMedium: item.priority === 'medium',
  }));

  return renderTemplate(queueTemplate, {
    priorityItems: items,
    stats: {
      incoming: moderationQueue.filter((item) => item.stage === 'incoming').length,
      review: moderationQueue.filter((item) => item.stage === 'review').length,
      overdue: moderationQueue.filter((item) => item.slaMinutes <= 6).length,
    },
  });
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
