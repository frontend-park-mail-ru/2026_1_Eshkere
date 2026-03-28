import './public-layout.scss';
import { renderTemplate } from 'shared/lib/render.js';
import { renderNavbar } from 'widgets/navbar';
import publicLayoutTemplate from './public-layout.hbs';

/**
 * Рендерит публичный layout-контейнер с navbar.
 *
 * @param {string} content - Внутренний HTML страницы.
 * @param {string} [pathname="/"] - Текущий pathname маршрута.
 * @return {Promise<string>} Сгенерированная строка HTML.
 */
export async function renderPublicLayout(content, pathname = '/') {
  const navbar = await renderNavbar(pathname);

  return await renderTemplate(publicLayoutTemplate, {
    navbar,
    content,
  });
}

/**
 * Обновляет только разметку навбара в уже смонтированном публичном лейауте.
 *
 * @param {string} [pathname="/"] Текущий путь маршрута.
 * @return {Promise<void>}
 */
export async function updatePublicNavbarSlot(pathname = '/') {
  const slot = document.getElementById('app-navbar-slot');
  if (!slot) {
    return;
  }
  slot.innerHTML = await renderNavbar(pathname);
}
