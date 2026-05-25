import './moderator-queue.scss';
import { navigateTo } from 'shared/lib/navigation';
import { listAdminAds, type AdminAdDto } from 'features/admin';
import { renderTemplate } from 'shared/lib/render';
import queueTemplate from './moderator-queue.hbs';

const MODERATOR_QUEUE_PAGE_SIZE = 3;
const FALLBACK_TEXT = '—';

type QueueStage = 'incoming' | 'review' | 'decision' | 'escalation';
type QueuePriority = 'critical' | 'high' | 'medium';

function cleanText(
  value: string | null | undefined,
  fallback = FALLBACK_TEXT,
): string {
  const text = value?.trim();
  return text ? text : fallback;
}

function getHostLabel(url: string | null | undefined): string {
  const rawUrl = url?.trim();

  if (!rawUrl) {
    return FALLBACK_TEXT;
  }

  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '') || rawUrl;
  } catch {
    return rawUrl;
  }
}

function getStageMeta(status: string): {
  stage: QueueStage;
  stageLabel: string;
  stageTone: QueueStage;
  actionLabel: string;
} {
  switch (status) {
    case 'approved':
    case 'active':
      return {
        stage: 'decision',
        stageLabel: 'Уже одобрено',
        stageTone: 'decision',
        actionLabel: 'Проверьте статус, если кейс повторно попал в очередь.',
      };
    case 'disapproved':
    case 'rejected':
      return {
        stage: 'decision',
        stageLabel: 'Уже отклонено',
        stageTone: 'decision',
        actionLabel: 'Проверьте причину отклонения и историю решения.',
      };
    case 'moderation':
    case 'pending':
    default:
      return {
        stage: 'incoming',
        stageLabel: 'Новый кейс',
        stageTone: 'incoming',
        actionLabel: 'Проверить объявление и вынести решение.',
      };
  }
}

function getPriorityMeta(ad: AdminAdDto): {
  priority: QueuePriority;
  priorityLabel: string;
  slaMinutes: number;
  slaTone: 'normal' | 'warning' | 'danger';
} {
  const hasMissingRequiredData =
    !ad.title?.trim() || !ad.short_desc?.trim() || !ad.target_url?.trim();

  if (hasMissingRequiredData) {
    return {
      priority: 'high',
      priorityLabel: 'High',
      slaMinutes: 30,
      slaTone: 'warning',
    };
  }

  return {
    priority: 'medium',
    priorityLabel: 'Средний',
    slaMinutes: 60,
    slaTone: 'normal',
  };
}

function mapAdToQueueItem(ad: AdminAdDto) {
  const title = cleanText(ad.title, `Объявление #${ad.id}`);
  const summary = cleanText(ad.short_desc, 'Описание объявления не заполнено.');
  const platform = getHostLabel(ad.target_url);
  const stageMeta = getStageMeta(ad.status);
  const priorityMeta = getPriorityMeta(ad);
  const tags = [
    cleanText(ad.status, 'unknown'),
    ad.image_url?.trim() ? 'есть креатив' : 'без изображения',
    ad.target_url?.trim() ? 'есть ссылка' : 'без ссылки',
  ];

  return {
    id: String(ad.id),
    title,
    advertiser: 'Рекламодатель не передан',
    platform,
    stage: stageMeta.stage,
    priority: priorityMeta.priority,
    slaMinutes: priorityMeta.slaMinutes,
    reason: summary,
    tags,
    createdAt: FALLBACK_TEXT,
    assignedTo: 'Не назначен',
    summary,
    objectType: 'Объявление',
    actionLabel: stageMeta.actionLabel,
    stageLabel: stageMeta.stageLabel,
    stageTone: stageMeta.stageTone,
    priorityLabel: priorityMeta.priorityLabel,
    slaTone: priorityMeta.slaTone,
    queueAgeLabel: FALLBACK_TEXT,
    tagsLabel: tags.join(', '),
    isCritical: priorityMeta.priority === 'critical',
    isHigh: priorityMeta.priority === 'high',
    isMedium: priorityMeta.priority === 'medium',
  };
}

export async function renderModeratorQueuePage(): Promise<string> {
  try {
    const ads = await listAdminAds();
    const items = ads.map(mapAdToQueueItem);

    return renderTemplate(queueTemplate, {
      priorityItems: items,
      stats: {
        incoming: items.filter((item) => item.stage === 'incoming').length,
        review: items.filter((item) => item.stage === 'review').length,
        overdue: items.filter((item) => item.slaTone === 'danger').length,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Не удалось загрузить очередь модерации.';

    return renderTemplate(queueTemplate, {
      priorityItems: [],
      stats: { incoming: 0, review: 0, overdue: 0 },
      loadError: message,
    });
  }
}

export function ModeratorQueuePage(): VoidFunction {
  const root = document.querySelector('.moderator-queue-page');

  if (!(root instanceof HTMLElement)) {
    return () => {};
  }

  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('.moderator-work-item'),
  );
  const searchInput = root.querySelector<HTMLInputElement>(
    '[data-moderator-queue-search]',
  );
  const stageFilter = root.querySelector<HTMLSelectElement>(
    '[data-moderator-stage-filter]',
  );
  const priorityFilter = root.querySelector<HTMLSelectElement>(
    '[data-moderator-priority-filter]',
  );
  const emptyState = root.querySelector<HTMLElement>(
    '[data-moderator-queue-empty]',
  );
  const hasLoadError =
    root.querySelector('.moderator-queue-empty--error') !== null;
  const pagination = root.querySelector<HTMLElement>(
    '[data-moderator-queue-pagination]',
  );
  const prevButton = root.querySelector<HTMLButtonElement>(
    '[data-pagination-prev]',
  );
  const nextButton = root.querySelector<HTMLButtonElement>(
    '[data-pagination-next]',
  );
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
      const matchesPriority =
        priority === 'all' || card.dataset.priority === priority;

      return matchesQuery && matchesStage && matchesPriority;
    });
  };

  const buildPaginationButton = (
    page: number,
    isActive: boolean,
  ): HTMLButtonElement => {
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
    const totalPages = Math.max(
      1,
      Math.ceil(filteredCards.length / MODERATOR_QUEUE_PAGE_SIZE),
    );

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const start = (currentPage - 1) * MODERATOR_QUEUE_PAGE_SIZE;
    const visibleCards = new Set(
      filteredCards.slice(start, start + MODERATOR_QUEUE_PAGE_SIZE),
    );

    cards.forEach((card) => {
      card.hidden = !visibleCards.has(card);
    });

    if (emptyState) {
      emptyState.hidden = hasLoadError || filteredCards.length > 0;
    }

    if (pagination) {
      pagination.hidden =
        hasLoadError || filteredCards.length <= MODERATOR_QUEUE_PAGE_SIZE;
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
    const totalPages = Math.max(
      1,
      Math.ceil(filteredCards.length / MODERATOR_QUEUE_PAGE_SIZE),
    );
    currentPage = Math.min(totalPages, currentPage + 1);
    renderQueueState();
  });

  root
    .querySelectorAll<HTMLElement>('[data-open-moderation-case]')
    .forEach((card) => {
      card.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;

        if (target?.closest('[data-toggle-case-details]')) {
          const details = card.querySelector<HTMLElement>(
            '.moderator-work-item__details',
          );
          const toggle = card.querySelector<HTMLButtonElement>(
            '[data-toggle-case-details]',
          );

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
