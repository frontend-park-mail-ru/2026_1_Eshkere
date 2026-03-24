import './sidebar.scss';
import {renderTemplate} from '../../shared/lib/render.js';
import sidebarTemplate from './sidebar.hbs';

/**
 * Рендерит сайдбар дашборда.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderSidebar() {
  return await renderTemplate(sidebarTemplate);
}
