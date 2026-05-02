import './ads.scss';
import { navigateTo } from 'shared/lib/navigation';
import { deleteAdCampaign, getAdGroups, getAds, getAdsInGroup } from 'features/ads';
import { isOfflineErrorMessage } from 'shared/lib/request';
import { renderTemplate } from 'shared/lib/render';
import type { AdItem } from 'features/ads/api/get-ads';
import type { CampaignDeleteModalDetail } from 'widgets/ads-delete-modal';
import { initCampaignActionMenus } from 'widgets/ads-action-menu';
import { initAdsDatePicker } from 'widgets/ads-date-picker';
import { initCampaignDeleteModal } from 'widgets/ads-delete-modal';
import { CAMPAIGNS_PAGINATION_REFRESH_EVENT, initCampaignPagination } from 'widgets/ads-pagination';
import adsPageTemplate from './ads.hbs';
import { mapAdsToCampaigns } from './ads-mappers';
import {
  bindCampaignStatusModal,
  notifyCampaignsLoadError,
  showCampaignsRequestError,
} from './ads-status-flow';

let adsPageLifecycleController: AbortController | null = null;

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
    const adCounts = await Promise.all(
      groupsResult.groups.map(async (group) => {
        const adsResult = await getAdsInGroup(campaignId, group.id);
        return adsResult.ads.length;
      }),
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
          navigateTo('/ads/create');
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
      if (id) navigateTo(`/ads/campaign?id=${id}`);
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
  const searchInput = document.getElementById(
    'campaigns-search',
  ) as HTMLInputElement | null;

  const applySearch = (query: string): void => {
    const normalizedQuery = query.trim().toLowerCase();

    document.querySelectorAll<HTMLElement>('.campaign-row').forEach((row) => {
      const searchableText = [
        row.dataset.campaignTitle || '',
        row.dataset.campaignGoal || '',
        row.textContent || '',
      ]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      row.dataset.searchHidden =
        normalizedQuery && !searchableText.includes(normalizedQuery)
          ? 'true'
          : 'false';
    });

    document.dispatchEvent(new CustomEvent(CAMPAIGNS_PAGINATION_REFRESH_EVENT));
  };

  searchInput?.addEventListener(
    'input',
    () => {
      applySearch(searchInput.value);
    },
    { signal },
  );
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
        window.location.reload();
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
  const result = await getAds();
  const adsWithComposition = await Promise.all(
    result.ads.map(enrichCampaignComposition),
  );
  const campaigns = mapAdsToCampaigns(adsWithComposition);

  return renderTemplate(adsPageTemplate, {
    campaigns,
    hasCampaigns: campaigns.length > 0,
    loadError:
      result.error && !isOfflineErrorMessage(result.message)
        ? (result.message ?? '')
        : '',
  });
}

export function Ads(): void | VoidFunction {
  if (adsPageLifecycleController) {
    adsPageLifecycleController.abort();
  }

  const controller = new AbortController();
  adsPageLifecycleController = controller;
  const { signal } = controller;

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

  return () => {
    if (adsPageLifecycleController === controller) {
      adsPageLifecycleController = null;
    }
    controller.abort();
  };
}
