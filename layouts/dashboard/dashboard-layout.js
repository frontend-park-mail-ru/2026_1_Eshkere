import {renderTemplate} from '../../assets/js/utils/render.js';
import {renderSidebar} from '../../components/sidebar/sidebar.js';
import {renderNavbar} from '../../components/navbar/navbar.js';
import dashboardLayoutTemplate from './dashboard-layout.hbs';

/**
 * Рендерит layout дашборда с сайдбаром и navbar.
 *
 * @param {string} content - Внутренний HTML страницы.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderDashboardLayout(content) {
  const sidebar = await renderSidebar();
  const navbar = await renderNavbar();

  return await renderTemplate(dashboardLayoutTemplate, {
    sidebar,
    navbar,
    content,
  });
}
