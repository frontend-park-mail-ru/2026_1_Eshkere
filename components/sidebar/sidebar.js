import {renderTemplate} from '../../assets/js/utils/render.js';
import sidebarTemplate from './sidebar.hbs';

/**
 * Рендерит сайдбар дашборда.
 *
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderSidebar() {
  return await renderTemplate(sidebarTemplate);
}
