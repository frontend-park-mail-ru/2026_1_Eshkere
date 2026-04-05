import './sidebar.scss';
import { renderTemplate } from 'shared/lib/render';
import sidebarTemplate from './sidebar.hbs';

/**
 * Рендерит сайдбар дашборда.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderSidebar(): Promise<string> {
  return await renderTemplate(sidebarTemplate);
}
