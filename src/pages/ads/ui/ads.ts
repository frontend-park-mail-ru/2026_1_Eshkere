import './ads.scss';
import { navigateTo } from 'app/navigation';
import { deleteAdCampaign, getAds } from 'features/ads';
import { isOfflineErrorMessage } from 'shared/lib/request';
import { renderTemplate } from 'shared/lib/render';
import type { CampaignDeleteModalDetail } from 'widgets/ads-delete-modal/ui/delete-modal';
import { initCampaignActionMenus } from 'widgets/ads-action-menu/ui/action-menu';
import { initAdsDatePicker } from 'widgets/ads-date-picker/ui/date-picker';
import { initCampaignDeleteModal } from 'widgets/ads-delete-modal/ui/delete-modal';
import {
  CAMPAIGNS_PAGINATION_REFRESH_EVENT,
  initCampaignPagination,
} from 'widgets/ads-pagination/ui/pagination';
import adsPageTemplate from './ads.hbs';
import { mapAdsToCampaigns } from './ads-mappers';
import {
  bindCampaignStatusModal,
  notifyCampaignsLoadError,
  showCampaignsRequestError,
} from './ads-status-flow';

let adsPageLifecycleController: AbortController | null = null;

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
  const campaigns = mapAdsToCampaigns(result.ads);

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
