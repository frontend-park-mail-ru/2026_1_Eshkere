import './ads.scss';
import { navigateTo } from 'app/navigation';
import { getAds } from 'features/ads';
import type { AdItem } from 'features/ads/api/get-ads';
import { formatDate, formatPrice } from 'shared/lib/format';
import { renderTemplate } from 'shared/lib/render';
import { initCampaignActionMenus } from 'widgets/ads-action-menu/ui/action-menu';
import { initAdsDatePicker } from 'widgets/ads-date-picker/ui/date-picker';
import { initCampaignDeleteModal } from 'widgets/ads-delete-modal/ui/delete-modal';
import { initCampaignPagination } from 'widgets/ads-pagination/ui/pagination';
import adsPageTemplate from './ads.hbs';

let adsPageLifecycleController: AbortController | null = null;

interface CampaignTemplateRow {
  id: AdItem['id'];
  title: string;
  budget: string;
  budgetValue: number;
  goal: string;
  lastActionDate: string;
  status: string;
  statusType: string;
  enabled: boolean;
}

function mapAdsToCampaigns(ads: AdItem[] = []): CampaignTemplateRow[] {
  return ads.map((ad) => ({
    id: ad.id,
    title: ad.title || 'Без названия',
    budget: typeof ad.price === 'number' ? formatPrice(ad.price) : '—',
    budgetValue: typeof ad.price === 'number' ? ad.price : 0,
    goal: ad.target_action || 'Без целевого действия',
    lastActionDate: formatDate(ad.created_at || ''),
    status: 'Активно',
    statusType: 'working',
    enabled: true,
  }));
}

export async function renderAdsPage(): Promise<string> {
  const result = await getAds();
  const campaigns = mapAdsToCampaigns(result.ads);

  return renderTemplate(adsPageTemplate, {
    campaigns,
    hasCampaigns: campaigns.length > 0,
    loadError: result.error ? (result.message ?? '') : '',
  });
}

export function Ads(): void | VoidFunction {
  if (adsPageLifecycleController) {
    adsPageLifecycleController.abort();
  }

  const controller = new AbortController();
  adsPageLifecycleController = controller;
  const { signal } = controller;

  const logoutButton = document.getElementById('logout-button');
  const navbarLogoutButton = document.getElementById('navbar-logout-button');

  if (logoutButton && navbarLogoutButton) {
    logoutButton.addEventListener(
      'click',
      () => {
        navbarLogoutButton.click();
      },
      { signal },
    );
  }

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

  initAdsDatePicker(signal);
  initCampaignActionMenus(signal);
  initCampaignDeleteModal(signal);
  initCampaignPagination(signal);

  return () => {
    if (adsPageLifecycleController === controller) {
      adsPageLifecycleController = null;
    }
    controller.abort();
  };
}
