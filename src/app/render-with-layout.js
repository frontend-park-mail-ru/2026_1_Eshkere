import { renderPublicLayout } from '../widgets/public-layout';
import { renderDashboardLayout } from '../widgets/dashboard-layout';

/**
 * @typedef {'public' | 'dashboard'} LayoutKind
 */

/**
 * Оборачивает HTML контента страницы в выбранный лейаут (слой app).
 *
 * @param {LayoutKind} layout Вариант оболочки.
 * @param {string} content HTML фрагмента страницы.
 * @param {string} [pathname='/'] Путь для navbar (только public).
 * @return {Promise<string>} Полная разметка для #app.
 */
export async function renderWithLayout(layout, content, pathname = '/') {
  if (layout === 'dashboard') {
    return renderDashboardLayout(content);
  }

  return renderPublicLayout(content, pathname);
}
