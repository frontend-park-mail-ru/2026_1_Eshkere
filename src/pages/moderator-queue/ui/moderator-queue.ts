import './moderator-queue.scss';
import { navigateTo } from 'shared/lib/navigation';
import { listAdminAds, type AdminAdDto } from 'features/admin';
import { renderTemplate } from 'shared/lib/render';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import queueTemplate from './moderator-queue.hbs';

const queuePageSize = 6;

function toProxiedUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const { pathname } = new URL(url);
      return pathname.startsWith('/s3/') ? pathname : '/s3' + pathname;
    } catch { /* fall through */ }
  }
  return url;
}

function getDomain(url: string | null | undefined): string {
  const raw = url?.trim();
  if (!raw) return '';
  try { return new URL(raw).hostname.replace(/^www\./, ''); } catch { return raw; }
}

function getStatusMeta(status: string): { label: string; tone: string } {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'approved' || normalized === 'approve') {
    return { label: 'Одобрено', tone: 'success' };
  }

  if (normalized === 'disapproved' || normalized === 'rejected' || normalized === 'disapprove') {
    return { label: 'Отклонено', tone: 'danger' };
  }

  return { label: 'На модерации', tone: 'moderation' };
}

async function mapAd(ad: AdminAdDto) {
  const title = ad.title?.trim() || `Объявление #${ad.id}`;
  const desc = ad.short_desc?.trim() || '';
  const domain = getDomain(ad.target_url);
  const imageUrl = toProxiedUrl(ad.image_url?.trim() || '');
  const status = getStatusMeta(ad.status || '');
  const openButton = await renderButton({
    text: 'Открыть',
    type: 'button',
    variant: 'secondary',
    className: 'mq-item__cta',
  });

  return {
    id: String(ad.id),
    caseUrl: `/moderator/case?id=${encodeURIComponent(String(ad.id))}`,
    title,
    desc,
    domain,
    imageUrl,
    statusLabel: status.label,
    statusTone: status.tone,
    openButton,
    searchText: `${title} ${desc} ${domain} ${status.label}`.toLowerCase(),
  };
}

export async function renderModeratorQueuePage(): Promise<string> {
  const searchField = await renderFormField({
    id: 'moderator-queue-search',
    name: 'moderatorQueueSearch',
    type: 'search',
    label: 'Поиск в очереди',
    placeholder: 'Поиск...',
    autocomplete: 'off',
    className: 'mq__search-input',
  });

  try {
    const ads = await listAdminAds();
    const items = await Promise.all(ads.map(mapAd));
    return renderTemplate(queueTemplate, {
      searchField,
      items,
      stats: { total: items.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось загрузить очередь.';
    return renderTemplate(queueTemplate, {
      searchField,
      items: [],
      stats: { total: 0 },
      loadError: message,
    });
  }
}

export function ModeratorQueuePage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.mq');
  if (!root) return () => {};

  const searchInput = root.querySelector<HTMLInputElement>('#moderator-queue-search');
  const emptyState = root.querySelector<HTMLElement>('[data-moderator-queue-empty]');
  const pagination = root.querySelector<HTMLElement>('[data-moderator-queue-pagination]');
  const pageList = root.querySelector<HTMLElement>('[data-mq-page-list]');
  const prevButton = root.querySelector<HTMLButtonElement>('[data-mq-page-prev]');
  const nextButton = root.querySelector<HTMLButtonElement>('[data-mq-page-next]');
  const items = Array.from(root.querySelectorAll<HTMLElement>('.mq-item'));
  let currentPage = 1;

  const getFilteredItems = (): HTMLElement[] => {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    return items.filter((item) => !query || (item.dataset.searchable ?? '').includes(query));
  };

  const renderPagination = (totalPages: number, totalItems: number): void => {
    if (!pagination || !pageList || !prevButton || !nextButton) {
      return;
    }

    const hasItems = totalItems > 0;
    pagination.hidden = !hasItems;
    if (!hasItems) {
      pageList.innerHTML = '';
      return;
    }

    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
    pageList.innerHTML = Array.from({ length: totalPages }, (_, index) => {
      const page = index + 1;
      const activeClass = page === currentPage ? ' is-active' : '';
      return `<button class="mq__page-button${activeClass}" type="button" data-mq-page="${page}">${page}</button>`;
    }).join('');
  };

  const applySearch = (): void => {
    const filteredItems = getFilteredItems();
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / queuePageSize));
    currentPage = Math.min(currentPage, totalPages);

    const pageStart = (currentPage - 1) * queuePageSize;
    const visibleItems = new Set(filteredItems.slice(pageStart, pageStart + queuePageSize));

    items.forEach((item) => {
      item.hidden = !visibleItems.has(item);
    });
    if (emptyState) emptyState.hidden = filteredItems.length > 0;
    renderPagination(totalPages, filteredItems.length);
  };

  searchInput?.addEventListener('input', () => {
    currentPage = 1;
    applySearch();
  });

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const pageButton = target.closest<HTMLButtonElement>('[data-mq-page]');
    if (pageButton?.dataset.mqPage) {
      currentPage = Number(pageButton.dataset.mqPage);
      applySearch();
      return;
    }

    if (target.closest('[data-mq-page-prev]')) {
      currentPage = Math.max(1, currentPage - 1);
      applySearch();
      return;
    }

    if (target.closest('[data-mq-page-next]')) {
      const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / queuePageSize));
      currentPage = Math.min(totalPages, currentPage + 1);
      applySearch();
      return;
    }

    const openTarget = target.closest<HTMLElement>('[data-open-moderation-case]');
    if (!openTarget) {
      return;
    }

    event.preventDefault();
    const id = openTarget.dataset.openModerationCase;
    if (id) navigateTo(`/moderator/case?id=${encodeURIComponent(id)}`);
  });

  applySearch();

  return () => {};
}
