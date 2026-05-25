import './moderator-queue.scss';
import { navigateTo } from 'shared/lib/navigation';
import { listAdminAds, type AdminAdDto } from 'features/admin';
import { renderTemplate } from 'shared/lib/render';
import queueTemplate from './moderator-queue.hbs';

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

function mapAd(ad: AdminAdDto) {
  const title = ad.title?.trim() || `Объявление #${ad.id}`;
  const desc = ad.short_desc?.trim() || '';
  const domain = getDomain(ad.target_url);
  const imageUrl = toProxiedUrl(ad.image_url?.trim() || '');

  return {
    id: String(ad.id),
    title,
    desc,
    domain,
    imageUrl,
    searchText: `${title} ${desc} ${domain}`.toLowerCase(),
  };
}

export async function renderModeratorQueuePage(): Promise<string> {
  try {
    const ads = await listAdminAds();
    const items = ads.map(mapAd);
    return renderTemplate(queueTemplate, {
      items,
      stats: { total: items.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось загрузить очередь.';
    return renderTemplate(queueTemplate, {
      items: [],
      stats: { total: 0 },
      loadError: message,
    });
  }
}

export function ModeratorQueuePage(): VoidFunction {
  const root = document.querySelector<HTMLElement>('.mq');
  if (!root) return () => {};

  const searchInput = root.querySelector<HTMLInputElement>('[data-moderator-queue-search]');
  const emptyState = root.querySelector<HTMLElement>('[data-moderator-queue-empty]');
  const items = Array.from(root.querySelectorAll<HTMLElement>('.mq-item'));

  const applySearch = (): void => {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    let visible = 0;
    items.forEach((item) => {
      const match = !query || (item.dataset.searchable ?? '').includes(query);
      item.hidden = !match;
      if (match) visible++;
    });
    if (emptyState) emptyState.hidden = visible > 0;
  };

  searchInput?.addEventListener('input', applySearch);

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.dataset.openModerationCase;
      if (id) navigateTo(`/moderator/case?id=${encodeURIComponent(id)}`);
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = item.dataset.openModerationCase;
        if (id) navigateTo(`/moderator/case?id=${encodeURIComponent(id)}`);
      }
    });
  });

  applySearch();

  return () => {};
}
