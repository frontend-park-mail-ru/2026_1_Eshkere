import './sidebar.scss';
import { renderTemplate } from 'shared/lib/render';
import {
  getCabinetKind,
  getCabinetSupportPath,
  isPartnerCabinet,
} from 'shared/lib/cabinet';
import { authState } from 'entities/user';
import sidebarTemplate from './sidebar.hbs';

/**
 * Рендерит сайдбар дашборда.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderSidebar(pathname = '/ads'): Promise<string> {
  const cabinet = getCabinetKind(pathname);
  const partnerCabinet = isPartnerCabinet(pathname);
  const isAddSites =
    pathname === '/add-sites' ||
    pathname.startsWith('/add-sites/') ||
    pathname === '/partner/sites' ||
    pathname.startsWith('/partner/sites/');
  const isPaymentResult =
    pathname === '/payment/success' ||
    pathname === '/payment/fail' ||
    pathname === '/payment/failure' ||
    pathname === '/payment/cancel' ||
    pathname === '/advertiser/payment/success' ||
    pathname === '/advertiser/payment/fail';

  return await renderTemplate(sidebarTemplate, {
    isPartnerCabinet: partnerCabinet,
    isPartnerOverview: pathname === '/partner/overview',
    isPartnerIncome: pathname === '/partner/income',
    isPartnerPayouts:
      pathname === '/partner/payouts' || pathname === '/partner/balance',
    isOverview: pathname === '/overview' || pathname === '/advertiser/overview',
    isCampaigns:
      pathname === '/ads' ||
      pathname.startsWith('/ads/') ||
      pathname === '/advertiser/campaigns' ||
      pathname.startsWith('/advertiser/campaigns/') ||
      pathname === '/advertiser/campaign' ||
      pathname.startsWith('/advertiser/campaign/') ||
      pathname.startsWith('/advertiser/stats/') ||
      pathname.startsWith('/advertiser/groups/') ||
      pathname.startsWith('/advertiser/ads/') ||
      pathname === '/advertiser/statistics',
    isBalance:
      pathname === '/balance' ||
      pathname === '/advertiser/balance' ||
      isPaymentResult,
    isAddSites,
    isSupport:
      pathname === '/support' ||
      pathname === '/advertiser/support' ||
      pathname === '/partner/support',
    showModeratorLink: authState.canAccessModerator(),
    supportHref: getCabinetSupportPath(cabinet),
  });
}
