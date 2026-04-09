import './dashboard-layout.scss';
import { renderTemplate } from 'shared/lib/render';
import { renderSidebar } from 'widgets/sidebar';
import { renderNavbar } from 'widgets/navbar';
import dashboardLayoutTemplate from './dashboard-layout.hbs';

/**
 * Рендерит layout дашборда с сайдбаром и navbar.
 *
 * @param {string} content - Внутренний HTML страницы.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderDashboardLayout(
  content: string,
  pathname: string = '/ads',
): Promise<string> {
  const showSidebar =
    pathname !== '/ads/create' && pathname !== '/ads/edit';
  const sidebar = showSidebar ? await renderSidebar(pathname) : '';
  const navbar = await renderNavbar(pathname);

  return await renderTemplate(dashboardLayoutTemplate, {
    sidebar,
    navbar,
    content,
    showSidebar,
  });
}

export async function updateDashboardLayoutSlots(
  pathname: string = '/ads',
): Promise<void> {
  const navbarSlot = document.getElementById('app-navbar-slot');
  const sidebarSlot = document.getElementById('app-sidebar-slot');
  const body = document.querySelector<HTMLElement>('.dashboard-layout__body');
  const showSidebar =
    pathname !== '/ads/create' && pathname !== '/ads/edit';

  if (navbarSlot) {
    navbarSlot.innerHTML = await renderNavbar(pathname);
  }

  if (sidebarSlot) {
    sidebarSlot.innerHTML = showSidebar ? await renderSidebar(pathname) : '';
    sidebarSlot.hidden = !showSidebar;
  }

  if (body) {
    body.classList.toggle('dashboard-layout__body--full', !showSidebar);
  }
}
