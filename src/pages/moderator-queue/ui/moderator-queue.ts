import './moderator-queue.scss';
import { navigateTo } from 'shared/lib/navigation';
import { markMotionUpdated, setupMotionEnhancements } from 'shared/lib/animations';
import { listAdminAds, type AdminAdDto } from 'features/admin';
import { renderTemplate } from 'shared/lib/render';
import { renderFormField } from 'shared/ui/form-field/form-field';
import { renderButton } from 'shared/ui/button/button';
import queueTemplate from './moderator-queue.hbs';

const PAGE_SIZE = 20;
const WINDOW = 2; // сколько кнопок с каждой стороны от текущей

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
  if (normalized === 'approved' || normalized === 'approve')
    return { label: 'Одобрено', tone: 'success' };
  if (normalized === 'disapproved' || normalized === 'rejected' || normalized === 'disapprove')
    return { label: 'Отклонено', tone: 'danger' };
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
    // Рендерим только первую страницу в начальный HTML
    const allMapped = await Promise.all(ads.map(mapAd));
    const firstPage = allMapped.slice(0, PAGE_SIZE);

    return renderTemplate(queueTemplate, {
      searchField,
      items: firstPage,
      stats: { total: ads.length },
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

// ─── Оконная пагинация ────────────────────────────────────────────────────────

function buildPageWindows(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: Array<number | '...'> = [];
  const lo = Math.max(2, current - WINDOW);
  const hi = Math.min(total - 1, current + WINDOW);

  pages.push(1);
  if (lo > 2) pages.push('...');
  for (let p = lo; p <= hi; p++) pages.push(p);
  if (hi < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

// ─── Гидрация страницы ────────────────────────────────────────────────────────

export function ModeratorQueuePage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.mq');
  if (!root) return () => {};

  const searchInput  = root.querySelector<HTMLInputElement>('#moderator-queue-search');
  const emptyState   = root.querySelector<HTMLElement>('[data-moderator-queue-empty]');
  const pagination   = root.querySelector<HTMLElement>('[data-moderator-queue-pagination]');
  const pageList     = root.querySelector<HTMLElement>('[data-mq-page-list]');
  const prevButton   = root.querySelector<HTMLButtonElement>('[data-mq-page-prev]');
  const nextButton   = root.querySelector<HTMLButtonElement>('[data-mq-page-next]');
  const listBody     = root.querySelector<HTMLElement>('.mq__list-body');

  let currentPage = 1;

  // Забираем все элементы из DOM в память — они уже скомпилированы с первой страницы
  // Остальные подгружаем отдельно
  const domItems = Array.from(root.querySelectorAll<HTMLElement>('.mq-item'));
  domItems.forEach(el => el.remove()); // убираем из DOM

  // Полный набор items (начинаем с тех что уже есть из SSR, потом дополним)
  let allItems: Array<{ el: HTMLElement; searchText: string }> = domItems.map(el => ({
    el,
    searchText: el.dataset.searchable ?? '',
  }));

  // Асинхронно догружаем все оставшиеся элементы
  void (async () => {
    try {
      const ads = await listAdminAds();
      if (ads.length > PAGE_SIZE) {
        const remaining = ads.slice(PAGE_SIZE);
        const mapped = await Promise.all(remaining.map(mapAd));

        for (const item of mapped) {
          const el = document.createElement('article');
          el.className = 'mq-item';
          el.dataset.searchable = item.searchText;
          el.innerHTML = `
            <div class="mq-item__title-cell">
              <a class="mq-item__title" href="${item.caseUrl}" data-open-moderation-case="${item.id}">${item.title}</a>
            </div>
            <div class="mq-item__desc">${item.desc}</div>
            <div class="mq-item__domain">${item.domain || '—'}</div>
            <div><span class="mq-item__status mq-item__status--${item.statusTone}">${item.statusLabel}</span></div>
            <div class="mq-item__cta-wrap" data-open-moderation-case="${item.id}">${item.openButton}</div>`;
          allItems.push({ el, searchText: item.searchText });
        }

        // Обновляем бейдж с итоговым числом
        const badge = root.querySelector<HTMLElement>('.mq__badge');
        if (badge) badge.textContent = String(ads.length);

        applyFilter();
      }
    } catch { /* уже показана ошибка или первая страница */ }
  })();

  function getFiltered(): typeof allItems {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    return query ? allItems.filter(it => it.searchText.includes(query)) : allItems;
  }

  function renderPageItems(items: typeof allItems): void {
    if (!listBody) return;
    listBody.innerHTML = '';
    const start = (currentPage - 1) * PAGE_SIZE;
    items.slice(start, start + PAGE_SIZE).forEach(it => listBody.appendChild(it.el));
    setupMotionEnhancements(listBody);
  }

  function renderPagination(totalItems: number): void {
    if (!pagination || !pageList || !prevButton || !nextButton) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

    pagination.hidden = totalItems === 0;
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;

    const windows = buildPageWindows(currentPage, totalPages);
    pageList.innerHTML = windows.map(p =>
      p === '...'
        ? `<span class="mq__page-ellipsis">…</span>`
        : `<button class="mq__page-button${p === currentPage ? ' is-active' : ''}" type="button" data-mq-page="${p}">${p}</button>`
    ).join('');
  }

  function applyFilter(): void {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    renderPageItems(filtered);
    renderPagination(filtered.length);

    if (emptyState) {
      const willShowEmpty = filtered.length === 0;
      const wasHidden = emptyState.hidden;
      emptyState.hidden = !willShowEmpty;
      if (willShowEmpty && wasHidden) {
        markMotionUpdated(emptyState, 'motion-empty-state', 420);
      }
    }
  }

  searchInput?.addEventListener('input', () => {
    currentPage = 1;
    applyFilter();
  });

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const pageButton = target.closest<HTMLButtonElement>('[data-mq-page]');
    if (pageButton?.dataset.mqPage) {
      currentPage = Number(pageButton.dataset.mqPage);
      applyFilter();
      listBody?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (target.closest('[data-mq-page-prev]')) {
      currentPage = Math.max(1, currentPage - 1);
      applyFilter();
      listBody?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (target.closest('[data-mq-page-next]')) {
      const filtered = getFiltered();
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      currentPage = Math.min(totalPages, currentPage + 1);
      applyFilter();
      listBody?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const openTarget = target.closest<HTMLElement>('[data-open-moderation-case]');
    if (openTarget) {
      event.preventDefault();
      const id = openTarget.dataset.openModerationCase;
      if (id) navigateTo(`/moderator/case?id=${encodeURIComponent(id)}`);
    }
  });

  // Начальная отрисовка
  applyFilter();

  return () => {};
}
