import './ads.scss';
import { navigateTo } from 'shared/lib/navigation';
import { setupMotionEnhancements } from 'shared/lib/animations';
import { maybeStartAdvertiserTour } from 'features/onboarding';
import { deleteAdCampaign, getAdGroups, getAds, getAdsInGroup } from 'features/ads';
import { getSubscription } from 'features/subscription';
import { isOfflineErrorMessage } from 'shared/lib/request';
import { showToast } from 'shared/lib/toast';
import { renderTemplate } from 'shared/lib/render';
import type { AdItem } from 'features/ads/api/get-ads';
import type { CampaignDeleteModalDetail } from 'widgets/ads-delete-modal';
import { initCampaignActionMenus } from 'widgets/ads-action-menu';
import { initAdsDatePicker } from 'widgets/ads-date-picker';
import { initCampaignDeleteModal } from 'widgets/ads-delete-modal';
import { bindTableRowSearch } from 'shared/lib/table-row-search';
import { CAMPAIGNS_PAGINATION_REFRESH_EVENT, initCampaignPagination } from 'widgets/ads-pagination';
import adsPageTemplate from './ads.hbs';
import { mapAdsToCampaigns } from './ads-mappers';
import {
  bindCampaignStatusModal,
  notifyCampaignsLoadError,
  showCampaignsRequestError,
} from './ads-status-flow';

let adsPageLifecycleController: AbortController | null = null;

const COMPOSITION_PREFETCH_LIMIT = 7;
const COMPOSITION_REQUEST_CONCURRENCY = 2;

async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  task: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex]);
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return results;
}

async function enrichCampaignComposition(ad: AdItem): Promise<AdItem> {
  const campaignId = Number(ad.id || '0');

  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return {
      ...ad,
      groupCount: 0,
      adCount: 0,
      compositionLoaded: false,
    };
  }

  try {
    const groupsResult = await getAdGroups(campaignId);
    const adCounts = await mapWithConcurrency(
      groupsResult.groups,
      COMPOSITION_REQUEST_CONCURRENCY,
      async (group) => {
        const adsResult = await getAdsInGroup(campaignId, group.id);
        return adsResult.ads.length;
      },
    );

    return {
      ...ad,
      groupCount: groupsResult.groups.length,
      adCount: adCounts.reduce((total, count) => total + count, 0),
      compositionLoaded: true,
    };
  } catch {
    return {
      ...ad,
      compositionLoaded: false,
    };
  }
}

function bindCreateButtons(signal: AbortSignal): void {
  document
    .querySelectorAll<HTMLElement>(
      '.campaigns-page__create-button, .campaigns-empty__create-button',
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          if (button.dataset.atLimit === 'true') {
            showToast(
              'Лимит кампаний',
              'Достигнут лимит активных кампаний для тарифа Basic. Перейдите на Pro.',
              'warning',
            );
            navigateTo('/subscription');
            return;
          }
          navigateTo('/advertiser/campaigns/create');
        },
        { signal },
      );
    });
}

function bindDetailLinks(signal: AbortSignal): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-campaign-detail-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const id = link.dataset.campaignDetailLink;
      if (id) navigateTo(`/advertiser/campaign?id=${id}`);
    }, { signal });
  });
}

function bindStatusFilter(signal: AbortSignal): void {
  const toggle   = document.querySelector<HTMLButtonElement>('[data-filter-toggle]');
  const dropdown = document.querySelector<HTMLElement>('[data-filter-dropdown]');
  const resetBtn = document.querySelector<HTMLButtonElement>('[data-filter-reset]');
  const wrap     = document.querySelector<HTMLElement>('[data-filter-wrap]');

  if (!toggle || !dropdown) return;

  const applyFilter = (): void => {
    const statusChecked = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-filter-status]:checked'),
    ).map((cb) => cb.value);

    const goalChecked = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-filter-goal]:checked'),
    ).map((cb) => cb.value);

    const sortVal = (document.querySelector<HTMLInputElement>('[data-filter-sort]:checked')?.value) ?? '';

    const tbody = document.querySelector('.campaigns-table__body');

    document.querySelectorAll<HTMLElement>('.campaign-row').forEach((row) => {
      const status = row.dataset.statusKey ?? '';
      const goal   = row.dataset.campaignGoal ?? '';

      const hiddenByStatus = statusChecked.length > 0 && !statusChecked.includes(status);
      const hiddenByGoal   = goalChecked.length > 0 && !goalChecked.includes(goal);
      row.dataset.filterHidden = hiddenByStatus || hiddenByGoal ? 'true' : 'false';
    });

    // Сортировка
    if (tbody && sortVal) {
      const rows = Array.from(tbody.querySelectorAll<HTMLElement>('.campaign-row'));
      rows.sort((a, b) => {
        if (sortVal === 'name-asc')    return (a.dataset.campaignTitle ?? '').localeCompare(b.dataset.campaignTitle ?? '', 'ru');
        if (sortVal === 'name-desc')   return (b.dataset.campaignTitle ?? '').localeCompare(a.dataset.campaignTitle ?? '', 'ru');
        if (sortVal === 'budget-desc') return Number(b.dataset.campaignBudgetValue ?? 0) - Number(a.dataset.campaignBudgetValue ?? 0);
        if (sortVal === 'budget-asc')  return Number(a.dataset.campaignBudgetValue ?? 0) - Number(b.dataset.campaignBudgetValue ?? 0);
        return 0;
      });
      rows.forEach((r) => tbody.appendChild(r));
    }

    document.dispatchEvent(new CustomEvent(CAMPAIGNS_PAGINATION_REFRESH_EVENT));

    const hasActive = statusChecked.length > 0 || goalChecked.length > 0 || Boolean(sortVal);
    toggle.style.borderColor = hasActive ? 'var(--primary-border)' : '';
    toggle.style.color = hasActive ? 'var(--primary-active)' : '';
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    dropdown.hidden = isOpen;
  }, { signal });

  document.querySelectorAll<HTMLInputElement>('[data-filter-status], [data-filter-goal], [data-filter-sort]').forEach((input) => {
    input.addEventListener('change', applyFilter, { signal });
  });

  resetBtn?.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('[data-filter-status], [data-filter-goal]').forEach((cb) => {
      cb.checked = false;
    });
    const defaultSort = document.querySelector<HTMLInputElement>('[data-filter-sort][value=""]');
    if (defaultSort) defaultSort.checked = true;
    applyFilter();
  }, { signal });

  document.addEventListener('click', (e) => {
    if (wrap && !wrap.contains(e.target as Node)) {
      toggle.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }
  }, { signal });
}

function bindSearch(signal: AbortSignal): void {
  bindTableRowSearch({
    inputId: 'campaigns-search',
    signal,
    buildSearchText: (row) =>
      [
        row.dataset.campaignTitle || '',
        row.dataset.campaignGoal || '',
        row.textContent || '',
      ].join(' '),
    onApply: () => {
      document.dispatchEvent(new CustomEvent(CAMPAIGNS_PAGINATION_REFRESH_EVENT));
    },
  });
}

function bindEmptyCreateButton(button: HTMLElement): void {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    navigateTo('/advertiser/campaigns/create');
  });
}

function renderEmptyCampaignsState(): HTMLElement {
  const emptyState = document.createElement('div');
  emptyState.className = 'campaigns-empty';
  emptyState.innerHTML = `
    <div class="campaigns-empty__illustration" aria-hidden="true">
      <picture>
        <source srcset="/img/empty-campaign.webp" type="image/webp" />
        <img class="campaigns-empty__image" src="/img/empty-campaign.webp" alt="" />
      </picture>
    </div>
    <h3 class="campaigns-empty__title">Здесь пока ничего нет...</h3>
    <button class="campaigns-empty__create-button" type="button">Создать кампанию</button>
  `;

  const createButton = emptyState.querySelector<HTMLElement>(
    '.campaigns-empty__create-button',
  );
  if (createButton) {
    bindEmptyCreateButton(createButton);
  }

  return emptyState;
}

function removeCampaignRow(campaignId: number): void {
  const row = document.querySelector<HTMLElement>(
    `.campaign-row[data-campaign-id="${campaignId}"]`,
  );

  if (!row) {
    return;
  }

  const table = row.closest<HTMLElement>('.campaigns-table');
  const body = row.closest<HTMLElement>('.campaigns-table__body');
  const footer = table?.querySelector<HTMLElement>('[data-campaigns-pagination]');

  row.remove();

  if (!body?.querySelector('.campaign-row')) {
    body?.remove();
    footer?.remove();
    const emptyState = renderEmptyCampaignsState();
    table?.appendChild(emptyState);
    setupMotionEnhancements(emptyState);
    return;
  }

  document.dispatchEvent(new CustomEvent(CAMPAIGNS_PAGINATION_REFRESH_EVENT));
}

function bindLogoutProxy(signal: AbortSignal): void {
  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');

  if (!logoutButton || !navbarLogoutButton) {
    return;
  }

  logoutButton.addEventListener(
    'click',
    () => {
      navbarLogoutButton.click();
    },
    { signal },
  );
}

function initDeleteFlow(signal: AbortSignal): void {
  initCampaignDeleteModal(signal, {
    onConfirm: async (detail: CampaignDeleteModalDetail) => {
      try {
        await deleteAdCampaign(detail.id);
        removeCampaignRow(detail.id);
      } catch {
        showCampaignsRequestError(
          'Не удалось удалить кампанию',
          'Сейчас мы временно не можем удалить кампанию. Попробуйте повторить действие немного позже.',
        );
        throw new Error('delete failed');
      }
    },
  });
}

export async function renderAdsPage(): Promise<string> {
  const [result, subs] = await Promise.all([
    getAds(),
    getSubscription().catch(() => null),
  ]);

  const enrichedAds = await mapWithConcurrency(
    result.ads.slice(0, COMPOSITION_PREFETCH_LIMIT),
    COMPOSITION_REQUEST_CONCURRENCY,
    enrichCampaignComposition,
  );
  const adsWithComposition = [
    ...enrichedAds,
    ...result.ads.slice(COMPOSITION_PREFETCH_LIMIT).map((ad) => ({
      ...ad,
      compositionLoaded: false,
    })),
  ];
  const campaigns = mapAdsToCampaigns(adsWithComposition);

  const usedCampaigns  = subs?.used_campaigns  ?? campaigns.length;
  const maxCampaigns   = subs?.max_campaigns   ?? 0;
  const atLimit        = maxCampaigns > 0 && usedCampaigns >= maxCampaigns;

  return renderTemplate(adsPageTemplate, {
    campaigns,
    hasCampaigns: campaigns.length > 0,
    loadError:
      result.error && !isOfflineErrorMessage(result.message)
        ? (result.message ?? '')
        : '',
    usedCampaigns,
    maxCampaigns,
    atLimit,
    campaignLimitLabel: maxCampaigns > 0 ? `${usedCampaigns} / ${maxCampaigns} кампаний` : '',
  });
}

export function Ads(): void | VoidFunction {
  if (adsPageLifecycleController) {
    adsPageLifecycleController.abort();
  }

  const controller = new AbortController();
  adsPageLifecycleController = controller;
  const { signal } = controller;

  maybeStartAdvertiserTour();
  notifyCampaignsLoadError(
    document.querySelector<HTMLElement>('[data-campaigns-load-error]'),
  );
  bindLogoutProxy(signal);
  bindCreateButtons(signal);
  bindDetailLinks(signal);
  bindStatusFilter(signal);
  initAdsDatePicker(signal);
  initCampaignActionMenus(signal);
  initDeleteFlow(signal);
  initCampaignPagination(signal);
  bindSearch(signal);
  bindCampaignStatusModal(signal);

  // Async: помечаем кнопки создания как заблокированные если лимит исчерпан
  getSubscription().then((subs) => {
    if (signal.aborted) return;

    const limitEl = document.querySelector<HTMLElement>('[data-campaigns-limit]');
    if (limitEl && subs.max_campaigns > 0) {
      limitEl.textContent = `${subs.used_campaigns} / ${subs.max_campaigns}`;
    }

    if (subs.max_campaigns > 0 && subs.used_campaigns >= subs.max_campaigns) {
      document.querySelectorAll<HTMLElement>(
        '.campaigns-page__create-button, .campaigns-empty__create-button',
      ).forEach((btn) => {
        btn.dataset.atLimit = 'true';
        btn.setAttribute('title', `Лимит ${subs.used_campaigns}/${subs.max_campaigns} — перейдите на Pro`);
      });
    }
  }).catch(() => null);

  return () => {
    if (adsPageLifecycleController === controller) {
      adsPageLifecycleController = null;
    }
    controller.abort();
  };
}
