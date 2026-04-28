import './sidebar.scss';
import { renderTemplate } from 'shared/lib/render';
import sidebarTemplate from './sidebar.hbs';

/**
 * Рендерит сайдбар дашборда.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderSidebar(pathname = '/ads'): Promise<string> {
  return await renderTemplate(sidebarTemplate, {
    isCampaigns: pathname === '/ads',
    isBalance: pathname === '/balance',
    isProfile: pathname === '/profile',
  });
}
