import './sidebar.scss';
import { renderTemplate } from 'shared/lib/render';
import sidebarTemplate from './sidebar.hbs';

/**
 * Рендерит сайдбар дашборда.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderSidebar(pathname = '/ads'): Promise<string> {
  const isAddSites =
    pathname === '/add-sites' || pathname.startsWith('/add-sites/');

  return await renderTemplate(sidebarTemplate, {
    isOverview: pathname === '/overview',
    isCampaigns: pathname === '/ads' || pathname.startsWith('/ads/'),
    isBalance: pathname === '/balance',
    isAddSites,
    isProfile: pathname === '/profile',
    isSupport: pathname === '/support',
  });
}
